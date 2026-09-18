namespace WebAppBase.Api.Services;

public interface IOomPaulLlmClient
{
    /// <summary>
    /// Streams one turn from the harness. Yields each reply fragment as it arrives and
    /// a terminal event carrying the stop reason, so a truncated or filtered reply is
    /// distinguishable from a complete one.
    /// </summary>
    /// <exception cref="OomPaulHarnessException">The harness refused the call or failed mid-stream.</exception>
    IAsyncEnumerable<OomPaulDelta> StreamReplyAsync(
        string sessionId,
        string message,
        CancellationToken cancellationToken);
}

/// <summary>
/// One event from the harness stream: a fragment of reply text, or — on the last
/// event — why generation stopped.
/// </summary>
public sealed record OomPaulDelta(string? Text, string? StopReason);

/// <summary>
/// The harness could not answer. Thrown instead of leaking an AWS exception type, so
/// the service maps one failure rather than the SDK's whole fault hierarchy.
/// </summary>
public sealed class OomPaulHarnessException(string message, Exception? innerException = null)
    : Exception(message, innerException);
