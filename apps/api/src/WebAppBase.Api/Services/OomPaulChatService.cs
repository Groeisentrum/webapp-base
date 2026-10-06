using System.Runtime.CompilerServices;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using WebAppBase.Api.Configuration;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Api.Repositories;

namespace WebAppBase.Api.Services;

/// <summary>
/// One chat turn with Oom Paul. Persona, safety rules and historical facts all live
/// in the AgentCore harness itself — this guards an unconfigured or switched-off
/// deployment, keeps the session id usable, and turns the harness stream into events
/// a caller can render as they arrive.
/// </summary>
public sealed partial class OomPaulChatService(
    IOomPaulLlmClient llmClient,
    ITenantSettingsRepository tenantSettingsRepository,
    IOptions<OomPaulOptions> options,
    ILogger<OomPaulChatService> logger)
{
    private const string EndTurn = "end_turn";

    /// <summary>
    /// Opens a turn. Every guard is settled before returning, so a refusal still maps to
    /// a status code; the harness is only called once the caller reads
    /// <see cref="OomPaulChatStream.Events"/>.
    /// </summary>
    public async Task<Result<OomPaulChatStream>> StartAsync(
        string message,
        string? sessionId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(options.Value.HarnessArn))
        {
            return Unavailable();
        }

        var settings = await tenantSettingsRepository.GetAsync(cancellationToken);

        // The admin toggle has to gate the endpoint itself: the chat URL is reachable
        // whether or not the site offers a way in. An unseeded deployment stays shut.
        if (settings is null || !settings.FeatureFlags.IsEnabled(FeatureFlagNames.Chatbot))
        {
            return Unavailable();
        }

        if (string.IsNullOrWhiteSpace(message))
        {
            return Result<OomPaulChatStream>.Failure(Error.Validation(
                ErrorCodes.ValidationFailed,
                "Stuur 'n boodskap vir Oom Paul."));
        }

        var resolvedSessionId = ResolveSessionId(sessionId);

        return Result<OomPaulChatStream>.Success(new OomPaulChatStream(
            resolvedSessionId,
            StreamAsync(resolvedSessionId, message.Trim(), cancellationToken)));
    }

    /// <summary>
    /// Buffers a whole turn into one reply, for callers that cannot consume a stream.
    /// </summary>
    public async Task<Result<OomPaulChatResponse>> SendAsync(
        string message,
        string? sessionId,
        CancellationToken cancellationToken)
    {
        var started = await StartAsync(message, sessionId, cancellationToken);

        if (started.IsFailure)
        {
            return Result<OomPaulChatResponse>.Failure(started.Error!);
        }

        var reply = new StringBuilder();

        await foreach (var chatEvent in started.Value.Events)
        {
            // Nothing has reached this caller yet, so a mid-stream failure can still be a
            // status code. Answering 200 with an empty string would hide it entirely.
            if (chatEvent.Kind == OomPaulChatEventKind.Error)
            {
                return Result<OomPaulChatResponse>.Failure(
                    Error.Unavailable(chatEvent.Value, FailureMessage(chatEvent.Value)));
            }

            if (chatEvent.Kind == OomPaulChatEventKind.Delta)
            {
                reply.Append(chatEvent.Value);
            }
        }

        return Result<OomPaulChatResponse>.Success(
            new OomPaulChatResponse(started.Value.SessionId, reply.ToString()));
    }

    private async IAsyncEnumerable<OomPaulChatEvent> StreamAsync(
        string sessionId,
        string message,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        await using var deltas = llmClient
            .StreamReplyAsync(sessionId, message, cancellationToken)
            .GetAsyncEnumerator(cancellationToken);

        var sawText = false;
        var failed = false;
        string? stopReason = null;

        while (true)
        {
            // A yield cannot sit inside a try that catches, so the enumeration is stepped
            // inside the guard and the event is yielded outside it.
            OomPaulDelta delta;

            try
            {
                if (!await deltas.MoveNextAsync())
                {
                    break;
                }

                delta = deltas.Current;
            }
            catch (OomPaulHarnessException exception)
            {
                logger.LogError(exception, "Oom Paul's harness failed mid-stream.");
                failed = true;
                break;
            }

            if (delta.StopReason is { } reason)
            {
                stopReason = reason;
            }

            if (delta.Text is not { Length: > 0 } text)
            {
                continue;
            }

            sawText = true;
            yield return new OomPaulChatEvent(OomPaulChatEventKind.Delta, text);
        }

        // The status code went out with the first byte, so everything below has to travel
        // as a frame the caller can read.
        if (failed)
        {
            yield return new OomPaulChatEvent(OomPaulChatEventKind.Error, ErrorCodes.OomPaulFailed);
            yield break;
        }

        if (!sawText)
        {
            logger.LogWarning(
                "Oom Paul produced no reply (stop reason {StopReason}).", stopReason ?? "none");

            yield return new OomPaulChatEvent(OomPaulChatEventKind.Error, ErrorCodes.OomPaulNoReply);
            yield break;
        }

        if (stopReason is { } finalReason && IsTruncated(finalReason))
        {
            logger.LogWarning("Oom Paul's reply was cut short (stop reason {StopReason}).", finalReason);

            yield return new OomPaulChatEvent(OomPaulChatEventKind.Error, ErrorCodes.OomPaulNoReply);
            yield break;
        }

        yield return new OomPaulChatEvent(OomPaulChatEventKind.Done, stopReason ?? EndTurn);
    }

    private string ResolveSessionId(string? sessionId)
    {
        if (sessionId is not null && SessionIdPattern().IsMatch(sessionId))
        {
            return sessionId;
        }

        if (!string.IsNullOrWhiteSpace(sessionId))
        {
            logger.LogDebug("Replaced an Oom Paul session id AgentCore would have refused.");
        }

        // Two guids give 64 characters, comfortably inside AgentCore's 33-100 window.
        return Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
    }

    /// <summary>
    /// The stop reasons that mean the visitor did not get the whole answer. Anything else,
    /// including a reason this version has never heard of, counts as a finished turn.
    /// </summary>
    private static bool IsTruncated(string stopReason) => stopReason is
        "content_filtered" or "max_tokens" or "timeout_exceeded" or "interrupted"
        or "model_context_window_exceeded";

    private static Result<OomPaulChatStream> Unavailable() =>
        Result<OomPaulChatStream>.Failure(Error.Unavailable(
            ErrorCodes.OomPaulUnavailable,
            "Oom Paul is nie vir hierdie werf beskikbaar nie."));

    private static string FailureMessage(string code) => code == ErrorCodes.OomPaulNoReply
        ? "Oom Paul het nie 'n antwoord gegee nie. Probeer weer."
        : "Oom Paul kon nie nou antwoord nie. Probeer weer.";

    /// <summary>
    /// AgentCore accepts a runtime session id of 33 to 100 characters from this alphabet
    /// and refuses everything else, which would otherwise surface as an opaque failure.
    /// </summary>
    [GeneratedRegex("^[a-zA-Z0-9][a-zA-Z0-9_-]{32,99}$")]
    private static partial Regex SessionIdPattern();
}

/// <summary>
/// An accepted turn: the session the reply belongs to, and the events it will produce.
/// The session id is known before the first event so a caller can persist it immediately.
/// </summary>
public sealed record OomPaulChatStream(string SessionId, IAsyncEnumerable<OomPaulChatEvent> Events);

/// <summary>
/// One event in a turn: a fragment of reply text, the stop reason that ended it, or the
/// error code of a failure that arrived too late to be a status code.
/// </summary>
public sealed record OomPaulChatEvent(OomPaulChatEventKind Kind, string Value);

public enum OomPaulChatEventKind
{
    Delta = 1,
    Done = 2,
    Error = 3
}
