using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using WebAppBase.Api.Configuration;

namespace WebAppBase.Api.Mcp;

/// <summary>
/// Guards the MCP endpoint with the shared secret the AgentCore Gateway presents on
/// every call.
/// </summary>
/// <remarks>
/// The tools behind it read published content rather than accounts, so a shared key is
/// proportionate — but it is the only thing in front of them, so it is checked on every
/// request and nothing about the configured key is ever echoed or logged.
/// </remarks>
public sealed class McpApiKeyFilter(IOptions<RetrievalOptions> options) : IEndpointFilter
{
    private const string HeaderName = "X-Api-Key";

    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        var configured = options.Value.McpApiKey;

        // An unconfigured deployment closes the endpoint instead of opening it. A key
        // nobody set must not become a tool surface anyone can call.
        if (string.IsNullOrEmpty(configured))
        {
            return Results.Unauthorized();
        }

        var supplied = context.HttpContext.Request.Headers[HeaderName].ToString();

        return Matches(configured, supplied)
            ? await next(context)
            : Results.Unauthorized();
    }

    /// <summary>
    /// Lengths are compared before the bytes, and the bytes in fixed time, so neither
    /// the length of the key nor how far a guess matched can be read off the timing.
    /// </summary>
    private static bool Matches(string configured, string supplied)
    {
        var expected = Encoding.UTF8.GetBytes(configured);
        var actual = Encoding.UTF8.GetBytes(supplied);

        return expected.Length == actual.Length
            && CryptographicOperations.FixedTimeEquals(expected, actual);
    }
}
