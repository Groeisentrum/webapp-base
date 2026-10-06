using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using WebAppBase.Api.Configuration;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Domain.ValueObjects;
using WebAppBase.Api.Repositories;
using WebAppBase.Api.Services;

namespace WebAppBase.Tests.Unit.Services;

public sealed class OomPaulChatServiceTests
{
    private const string HarnessArn = "arn:aws:bedrock-agentcore:eu-west-1:123456789012:runtime/oompaul";

    /// <summary>36 characters from AgentCore's allowed alphabet — inside its 33-100 window.</summary>
    private const string ValidSessionId = "abcdefghijklmnopqrstuvwxyz0123456789";

    private readonly IOomPaulLlmClient llmClient = Substitute.For<IOomPaulLlmClient>();
    private readonly ITenantSettingsRepository tenantSettingsRepository =
        Substitute.For<ITenantSettingsRepository>();
    private readonly OomPaulChatService chatService;

    public OomPaulChatServiceTests()
    {
        chatService = BuildService(HarnessArn);

        tenantSettingsRepository.GetAsync(Arg.Any<CancellationToken>())
            .Returns(BuildSettings(chatbotEnabled: true));

        ArrangeStream(
            new OomPaulDelta("Goeiedag, ", null),
            new OomPaulDelta("burger.", null),
            new OomPaulDelta(null, "end_turn"));
    }

    // ---- Guards: settled before a single byte is written --------------------

    /// <summary>
    /// A deployment that never configured a harness is not the caller's mistake, so the
    /// old 400 sent them hunting for a bad request they could not fix.
    /// </summary>
    [Fact]
    public async Task StartAsync_WithoutHarnessArn_ReportsUnavailable()
    {
        var service = BuildService(string.Empty);

        var result = await service.StartAsync("Hallo", null, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Kind.Should().Be(ErrorKind.Unavailable);
        result.Error.Code.Should().Be(ErrorCodes.OomPaulUnavailable);
        llmClient.DidNotReceive().StreamReplyAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    /// <summary>
    /// The admin toggle has to gate the endpoint, not just the navigation — the chat URL
    /// is reachable directly.
    /// </summary>
    [Fact]
    public async Task StartAsync_WithChatbotFlagOff_ReportsUnavailable()
    {
        tenantSettingsRepository.GetAsync(Arg.Any<CancellationToken>())
            .Returns(BuildSettings(chatbotEnabled: false));

        var result = await chatService.StartAsync("Hallo", null, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Kind.Should().Be(ErrorKind.Unavailable);
        result.Error.Code.Should().Be(ErrorCodes.OomPaulUnavailable);
        llmClient.DidNotReceive().StreamReplyAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    /// <summary>An unseeded deployment has no opinion yet, so the chatbot stays shut.</summary>
    [Fact]
    public async Task StartAsync_WithoutTenantSettings_ReportsUnavailable()
    {
        tenantSettingsRepository.GetAsync(Arg.Any<CancellationToken>()).Returns((TenantSettings?)null);

        var result = await chatService.StartAsync("Hallo", null, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Kind.Should().Be(ErrorKind.Unavailable);
        llmClient.DidNotReceive().StreamReplyAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task StartAsync_WithBlankMessage_Fails()
    {
        var result = await chatService.StartAsync("   ", ValidSessionId, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Kind.Should().Be(ErrorKind.Validation);
        result.Error.Code.Should().Be(ErrorCodes.ValidationFailed);
        llmClient.DidNotReceive().StreamReplyAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    // ---- Session id --------------------------------------------------------

    /// <summary>
    /// AgentCore refuses a runtime session id outside 33-100 characters of its alphabet,
    /// and that refusal used to surface as an opaque 500. A caller's unusable id is
    /// replaced rather than rejected.
    /// </summary>
    [Fact]
    public async Task StartAsync_WithMalformedSessionId_MintsAValidOne()
    {
        var result = await chatService.StartAsync("Hallo", "abc", CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.SessionId.Should().NotBe("abc");
        result.Value.SessionId.Should().MatchRegex("^[a-zA-Z0-9][a-zA-Z0-9_-]*$");
        result.Value.SessionId.Length.Should().BeInRange(33, 100);

        await CollectAsync(result.Value.Events);

        llmClient.Received(1).StreamReplyAsync(
            result.Value.SessionId, "Hallo", Arg.Any<CancellationToken>());
    }

    /// <summary>
    /// Conversation memory lives in AgentCore keyed by this id, so a usable one has to
    /// survive untouched or every turn starts a new conversation.
    /// </summary>
    [Fact]
    public async Task StartAsync_WithValidSessionId_ReusesIt()
    {
        var result = await chatService.StartAsync("Hallo", ValidSessionId, CancellationToken.None);

        result.Value.SessionId.Should().Be(ValidSessionId);

        await CollectAsync(result.Value.Events);

        llmClient.Received(1).StreamReplyAsync(
            ValidSessionId, "Hallo", Arg.Any<CancellationToken>());
    }

    // ---- The stream itself -------------------------------------------------

    [Fact]
    public async Task StartAsync_WithSuccessfulStream_YieldsDeltasThenDone()
    {
        var result = await chatService.StartAsync("Hallo", ValidSessionId, CancellationToken.None);

        var events = await CollectAsync(result.Value.Events);

        events.Should().HaveCount(3);
        events[0].Should().Be(new OomPaulChatEvent(OomPaulChatEventKind.Delta, "Goeiedag, "));
        events[1].Should().Be(new OomPaulChatEvent(OomPaulChatEventKind.Delta, "burger."));
        events[2].Should().Be(new OomPaulChatEvent(OomPaulChatEventKind.Done, "end_turn"));
    }

    /// <summary>
    /// The status code is already on the wire by the time the harness fails, so the
    /// failure has to reach the browser as a frame instead.
    /// </summary>
    [Fact]
    public async Task StartAsync_WhenHarnessThrows_YieldsErrorEvent()
    {
        llmClient.StreamReplyAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(FailingStream());

        var result = await chatService.StartAsync("Hallo", ValidSessionId, CancellationToken.None);

        var events = await CollectAsync(result.Value.Events);

        events.Should().NotBeEmpty();
        events[^1].Should().Be(new OomPaulChatEvent(OomPaulChatEventKind.Error, ErrorCodes.OomPaulFailed));
    }

    /// <summary>A silent harness used to read as a perfectly successful empty answer.</summary>
    [Fact]
    public async Task StartAsync_WhenStreamIsEmpty_YieldsErrorEvent()
    {
        ArrangeStream();

        var result = await chatService.StartAsync("Hallo", ValidSessionId, CancellationToken.None);

        var events = await CollectAsync(result.Value.Events);

        events.Should().ContainSingle()
            .Which.Should().Be(new OomPaulChatEvent(OomPaulChatEventKind.Error, ErrorCodes.OomPaulNoReply));
    }

    /// <summary>
    /// A filtered or truncated turn is not an answer; reporting it as done would leave
    /// the visitor reading half a sentence and assuming Oom Paul had finished.
    /// </summary>
    [Fact]
    public async Task StartAsync_WhenStopReasonIsContentFiltered_YieldsErrorEvent()
    {
        ArrangeStream(new OomPaulDelta("Ek ", null), new OomPaulDelta(null, "content_filtered"));

        var result = await chatService.StartAsync("Hallo", ValidSessionId, CancellationToken.None);

        var events = await CollectAsync(result.Value.Events);

        events[^1].Should().Be(new OomPaulChatEvent(OomPaulChatEventKind.Error, ErrorCodes.OomPaulNoReply));
        events.Should().NotContain(chatEvent => chatEvent.Kind == OomPaulChatEventKind.Done);
    }

    // ---- The buffered shape ------------------------------------------------

    [Fact]
    public async Task SendAsync_WithSuccessfulStream_ReturnsAssembledReply()
    {
        var result = await chatService.SendAsync("Hallo", ValidSessionId, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.SessionId.Should().Be(ValidSessionId);
        result.Value.Reply.Should().Be("Goeiedag, burger.");
    }

    /// <summary>
    /// A buffered caller has seen no bytes yet, so a mid-stream failure can still become
    /// a status code — 200 with an empty reply hid the failure completely.
    /// </summary>
    [Fact]
    public async Task SendAsync_WhenHarnessThrows_ReportsUnavailable()
    {
        llmClient.StreamReplyAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(FailingStream());

        var result = await chatService.SendAsync("Hallo", ValidSessionId, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Kind.Should().Be(ErrorKind.Unavailable);
        result.Error.Code.Should().Be(ErrorCodes.OomPaulFailed);
    }

    private OomPaulChatService BuildService(string harnessArn) => new(
        llmClient,
        tenantSettingsRepository,
        Options.Create(new OomPaulOptions { HarnessArn = harnessArn }),
        NullLogger<OomPaulChatService>.Instance);

    private void ArrangeStream(params OomPaulDelta[] deltas) =>
        llmClient.StreamReplyAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(StreamOf(deltas));

    private static async IAsyncEnumerable<OomPaulDelta> StreamOf(params OomPaulDelta[] deltas)
    {
        await Task.CompletedTask;

        foreach (var delta in deltas)
        {
            yield return delta;
        }
    }

    private static async IAsyncEnumerable<OomPaulDelta> FailingStream()
    {
        await Task.CompletedTask;

        yield return new OomPaulDelta("Ek ", null);

        throw new OomPaulHarnessException("Die harnas het gaan lê.");
    }

    private static async Task<IReadOnlyList<OomPaulChatEvent>> CollectAsync(
        IAsyncEnumerable<OomPaulChatEvent> events)
    {
        var collected = new List<OomPaulChatEvent>();

        await foreach (var chatEvent in events)
        {
            collected.Add(chatEvent);
        }

        return collected;
    }

    private static TenantSettings BuildSettings(bool chatbotEnabled) => new()
    {
        Id = 1,
        SiteName = "Toetswerf",
        DefaultLanguageCode = "af",
        ActiveLanguageCodes = ["af"],
        FeatureFlags = FeatureFlags.Empty().With(FeatureFlagNames.Chatbot, chatbotEnabled)
    };
}
