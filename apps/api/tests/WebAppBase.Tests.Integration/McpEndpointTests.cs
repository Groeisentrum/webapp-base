using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using WebAppBase.Tests.Integration.Infrastructure;

namespace WebAppBase.Tests.Integration;

/// <summary>
/// Covers the remote MCP server that Bedrock AgentCore calls to look things up in
/// this deployment's content.
/// </summary>
/// <remarks>
/// This is the one API surface reached from outside rather than through the webhost,
/// so the shared secret in front of it is the whole of its authentication. The tests
/// that matter here are the ones that prove it refuses.
/// </remarks>
public sealed class McpEndpointTests : IClassFixture<WebAppApiFactory>
{
    private readonly WebAppApiFactory factory;

    public McpEndpointTests(WebAppApiFactory factory) => this.factory = factory;

    [Fact]
    public async Task Mcp_WithoutTheSharedSecret_IsRefused()
    {
        using var caller = factory.AsAnonymous();

        var response = await caller.SendAsync(ToolsListRequest(apiKey: null));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Mcp_WithTheWrongSharedSecret_IsRefused()
    {
        using var caller = factory.AsAnonymous();

        var response = await caller.SendAsync(ToolsListRequest("not-the-key"));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    /// <summary>
    /// A truncated key must fail on its own merits rather than on a prefix match — the
    /// comparison checks length before bytes for exactly this case.
    /// </summary>
    [Fact]
    public async Task Mcp_WithATruncatedSharedSecret_IsRefused()
    {
        using var caller = factory.AsAnonymous();

        var response = await caller.SendAsync(ToolsListRequest(WebAppApiFactory.McpApiKey[..8]));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Mcp_WithTheSharedSecret_ListsTheSiteContentTools()
    {
        using var caller = factory.AsAnonymous();

        var response = await caller.SendAsync(ToolsListRequest(WebAppApiFactory.McpApiKey));

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var toolNames = ReadToolNames(await response.Content.ReadAsStringAsync());

        toolNames.Should().Contain("search_site_content");
        toolNames.Should().Contain("get_site_content");
    }

    private static HttpRequestMessage ToolsListRequest(string? apiKey)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/mcp")
        {
            Content = new StringContent(
                """{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}""",
                Encoding.UTF8,
                "application/json")
        };

        // Streamable HTTP lets the server answer with either a single JSON body or an
        // event stream, so a client has to say it will take both.
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("text/event-stream"));

        if (apiKey is not null)
        {
            request.Headers.Add("X-Api-Key", apiKey);
        }

        return request;
    }

    /// <summary>
    /// Reads the tool names out of whichever of the two response shapes arrived: a bare
    /// JSON-RPC body, or the same body wrapped in a single server-sent event.
    /// </summary>
    private static IReadOnlyList<string> ReadToolNames(string body)
    {
        var payload = body.TrimStart().StartsWith('{')
            ? body
            : body
                .Split('\n')
                .First(line => line.StartsWith("data: ", StringComparison.Ordinal))["data: ".Length..];

        return [.. JsonSerializer.Deserialize<JsonElement>(payload)
            .GetProperty("result")
            .GetProperty("tools")
            .EnumerateArray()
            .Select(tool => tool.GetProperty("name").GetString()!)];
    }
}
