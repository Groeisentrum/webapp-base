using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Tests.Integration.Infrastructure;

namespace WebAppBase.Tests.Integration;

/// <summary>
/// Covers the visitor-facing chat endpoint: that it is reachable anonymously, that a
/// deployment can switch it off, and that it cannot be run up as a bill.
/// </summary>
/// <remarks>
/// Every test uses its own forwarded address. The rate limiter partitions on that
/// header, so tests sharing one would spend each other's allowance and the throttling
/// test would decide the outcome of whichever test ran after it.
/// </remarks>
public sealed class OomPaulChatTests : IClassFixture<WebAppApiFactory>
{
    private readonly WebAppApiFactory factory;

    public OomPaulChatTests(WebAppApiFactory factory) => this.factory = factory;

    [Fact]
    public async Task Chat_WithTheChatbotEnabled_ReturnsTheAssembledReply()
    {
        await SeedWithChatbotAsync(enabled: true);
        factory.OomPaulLlmClient.Deltas = ["Goeiedag, ", "jong burger."];

        using var visitor = VisitorFrom("203.0.113.10");
        var response = await visitor.PostAsJsonAsync("/api/public/oompaul/chat", new OomPaulChatRequest
        {
            Message = "Wat kan ek hier sien?"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var reply = await response.Content.ReadFromJsonAsync<OomPaulChatResponse>();

        reply!.Reply.Should().Be("Goeiedag, jong burger.");
        reply.SessionId.Should().NotBeNullOrWhiteSpace();
        factory.OomPaulLlmClient.LastMessage.Should().Be("Wat kan ek hier sien?");
    }

    /// <summary>
    /// The admin toggle used to be decorative — it was surfaced to the public site and
    /// read by nothing, so switching it off disabled no part of the feature.
    /// </summary>
    [Fact]
    public async Task Chat_WithTheChatbotSwitchedOff_ReportsUnavailable()
    {
        await SeedWithChatbotAsync(enabled: false);

        using var visitor = VisitorFrom("203.0.113.11");
        var response = await visitor.PostAsJsonAsync("/api/public/oompaul/chat", new OomPaulChatRequest
        {
            Message = "Wat kan ek hier sien?"
        });

        response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        (await ReadCodeAsync(response)).Should().Be(ErrorCodes.OomPaulUnavailable);
    }

    [Fact]
    public async Task Chat_WithoutAMessage_IsRejected()
    {
        await SeedWithChatbotAsync(enabled: true);

        using var visitor = VisitorFrom("203.0.113.12");
        var response = await visitor.PostAsJsonAsync("/api/public/oompaul/chat", new OomPaulChatRequest
        {
            Message = string.Empty
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    /// <summary>
    /// A session id the harness would refuse is replaced rather than passed on, so a
    /// caller echoing back something of its own invention cannot turn into a 500.
    /// </summary>
    [Fact]
    public async Task Chat_WithASessionIdTheHarnessWouldRefuse_SubstitutesAValidOne()
    {
        await SeedWithChatbotAsync(enabled: true);

        using var visitor = VisitorFrom("203.0.113.13");
        var response = await visitor.PostAsJsonAsync("/api/public/oompaul/chat", new OomPaulChatRequest
        {
            Message = "Goeiedag",
            SessionId = "nee"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var reply = await response.Content.ReadFromJsonAsync<OomPaulChatResponse>();

        reply!.SessionId.Should().NotBe("nee");
        reply.SessionId.Length.Should().BeInRange(33, 100);
        factory.OomPaulLlmClient.LastSessionId.Should().Be(reply.SessionId);
    }

    [Fact]
    public async Task ChatStream_SendsTheSessionFirst_ThenTheReply_ThenDone()
    {
        await SeedWithChatbotAsync(enabled: true);
        factory.OomPaulLlmClient.Deltas = ["Die ", "monument"];

        using var visitor = VisitorFrom("203.0.113.14");
        var response = await visitor.PostAsJsonAsync("/api/public/oompaul/chat/stream", new OomPaulChatRequest
        {
            Message = "Vertel my meer"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType!.MediaType.Should().Be("text/event-stream");

        var frames = await ReadFramesAsync(response);

        frames.Select(frame => frame.GetProperty("kind").GetString())
            .Should().Equal("session", "delta", "delta", "done");
        frames[0].GetProperty("sessionId").GetString().Should().NotBeNullOrWhiteSpace();
        frames[1].GetProperty("text").GetString().Should().Be("Die ");
        frames[2].GetProperty("text").GetString().Should().Be("monument");
    }

    /// <summary>
    /// Once the first frame is written the status is already 200, so a harness failure
    /// has to travel as a frame. Silently ending the stream would read as a finished
    /// answer that happened to be short.
    /// </summary>
    [Fact]
    public async Task ChatStream_WhenTheHarnessFails_SendsAnErrorFrame()
    {
        await SeedWithChatbotAsync(enabled: true);
        factory.OomPaulLlmClient.ThrowOnInvoke = true;

        try
        {
            using var visitor = VisitorFrom("203.0.113.15");
            var response = await visitor.PostAsJsonAsync("/api/public/oompaul/chat/stream", new OomPaulChatRequest
            {
                Message = "Vertel my meer"
            });

            var frames = await ReadFramesAsync(response);

            frames.Last().GetProperty("kind").GetString().Should().Be("error");
            frames.Last().GetProperty("code").GetString().Should().Be(ErrorCodes.OomPaulFailed);
        }
        finally
        {
            factory.OomPaulLlmClient.ThrowOnInvoke = false;
        }
    }

    /// <summary>
    /// Every turn is a billed model call on an anonymous endpoint, which makes this the
    /// obvious thing to run up someone else's bill with.
    /// </summary>
    [Fact]
    public async Task Chat_WhenOneCallerKeepsAsking_IsEventuallyThrottled()
    {
        await SeedWithChatbotAsync(enabled: true);

        using var visitor = VisitorFrom("203.0.113.16");
        HttpStatusCode? lastStatus = null;

        for (var attempt = 0; attempt < 25; attempt++)
        {
            var response = await visitor.PostAsJsonAsync("/api/public/oompaul/chat", new OomPaulChatRequest
            {
                Message = "Goeiedag"
            });

            lastStatus = response.StatusCode;

            if (lastStatus == HttpStatusCode.TooManyRequests)
            {
                break;
            }
        }

        lastStatus.Should().Be(HttpStatusCode.TooManyRequests);
    }

    private HttpClient VisitorFrom(string address)
    {
        var client = factory.AsAnonymous();
        client.DefaultRequestHeaders.Add("X-Forwarded-For", address);

        return client;
    }

    private async Task SeedWithChatbotAsync(bool enabled)
    {
        using var adminClient = factory.AsAdmin();

        var response = await adminClient.PutAsJsonAsync("/api/tenant-settings", new UpdateTenantSettingsRequest
        {
            SiteName = "Toetswerf",
            DefaultLanguageCode = "af",
            ActiveLanguageCodes = ["af", "en"],
            FeatureFlags = new Dictionary<string, bool> { [FeatureFlagNames.Chatbot] = enabled }
        });

        response.EnsureSuccessStatusCode();
    }

    private static async Task<string?> ReadCodeAsync(HttpResponseMessage response)
    {
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        return problem.GetProperty("code").GetString();
    }

    private static async Task<IReadOnlyList<JsonElement>> ReadFramesAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();

        return [.. body
            .Split("\n\n", StringSplitOptions.RemoveEmptyEntries)
            .Select(frame => frame.Trim())
            .Where(frame => frame.StartsWith("data: ", StringComparison.Ordinal))
            .Select(frame => JsonSerializer.Deserialize<JsonElement>(frame["data: ".Length..]))];
    }
}
