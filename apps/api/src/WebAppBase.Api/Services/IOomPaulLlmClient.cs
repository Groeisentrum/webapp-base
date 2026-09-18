namespace WebAppBase.Api.Services;

public interface IOomPaulLlmClient
{
    /// <summary>Sends one visitor message and returns Oom Paul's full reply.</summary>
    Task<string> SendMessageAsync(string sessionId, string message, CancellationToken cancellationToken);
}
