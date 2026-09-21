using System.Runtime.CompilerServices;
using WebAppBase.Api.Services;

namespace WebAppBase.Tests.Integration.Infrastructure;

/// <summary>
/// Stands in for Bedrock AgentCore so the chat endpoint can be exercised end to end
/// without an AWS call.
/// </summary>
/// <remarks>
/// Records the session id it was handed, which is the only part of the conversation
/// this API is responsible for — the harness owns everything else, so there is
/// nothing else worth asserting on from here.
/// </remarks>
public sealed class RecordingOomPaulLlmClient : IOomPaulLlmClient
{
    /// <summary>Deltas the next turn will stream. Replace to script a different reply.</summary>
    public IReadOnlyList<string> Deltas { get; set; } = ["Goeiedag, ", "jong burger."];

    /// <summary>Set to have the stream end truncated rather than complete.</summary>
    public string? StopReason { get; set; }

    /// <summary>Set to have the harness refuse the turn.</summary>
    public bool ThrowOnInvoke { get; set; }

    public string? LastSessionId { get; private set; }

    public string? LastMessage { get; private set; }

    public async IAsyncEnumerable<OomPaulDelta> StreamReplyAsync(
        string sessionId,
        string message,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        LastSessionId = sessionId;
        LastMessage = message;

        if (ThrowOnInvoke)
        {
            throw new OomPaulHarnessException("The test harness refused this turn.");
        }

        foreach (var delta in Deltas)
        {
            cancellationToken.ThrowIfCancellationRequested();
            yield return new OomPaulDelta(delta, null);
        }

        await Task.CompletedTask;

        yield return new OomPaulDelta(null, StopReason);
    }
}
