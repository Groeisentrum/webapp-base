using Microsoft.Extensions.Options;
using WebAppBase.Api.Configuration;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Models.Responses;

namespace WebAppBase.Api.Services;

/// <summary>
/// One chat turn with Oom Paul. Persona, safety rules and historical facts all live
/// in the AgentCore harness itself — this only guards against an unconfigured
/// deployment and carries the session forward.
/// </summary>
public sealed class OomPaulChatService(IOomPaulLlmClient llmClient, IOptions<OomPaulOptions> options)
{
    public async Task<Result<OomPaulChatResponse>> SendAsync(
        string message,
        string? sessionId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(options.Value.HarnessArn))
        {
            return Result<OomPaulChatResponse>.Failure(Error.Validation(
                ErrorCodes.OomPaulUnavailable,
                "Oom Paul is nie vir hierdie werf beskikbaar nie."));
        }

        var resolvedSessionId = string.IsNullOrWhiteSpace(sessionId)
            ? Guid.NewGuid().ToString()
            : sessionId;

        var reply = await llmClient.SendMessageAsync(resolvedSessionId, message.Trim(), cancellationToken);

        return Result<OomPaulChatResponse>.Success(new OomPaulChatResponse(resolvedSessionId, reply));
    }
}
