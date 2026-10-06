using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Extensions;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Api.Services;

namespace WebAppBase.Api.Controllers;

/// <summary>
/// Chat with Oom Paul, the historical portrayal of Paul Kruger at the Voortrekker
/// Monument.
/// </summary>
/// <remarks>
/// Anonymous, since visitors arrive without signing in — and rate limited by
/// consequence: every turn is a billed model call, so this is the obvious target for
/// automated abuse.
/// </remarks>
[ApiController]
[Route("api/public/oompaul")]
[AllowAnonymous]
public sealed class OomPaulController(OomPaulChatService chatService) : ControllerBase
{
    private static readonly JsonSerializerOptions FrameSerialization = new(JsonSerializerDefaults.Web);

    [HttpPost("chat")]
    [EnableRateLimiting(RateLimitPolicies.OomPaulChat)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<OomPaulChatResponse>> ChatAsync(
        [FromBody] OomPaulChatRequest request,
        CancellationToken cancellationToken)
    {
        var result = await chatService.SendAsync(request.Message, request.SessionId, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// The same turn as <see cref="ChatAsync"/>, delivered as server-sent events so the
    /// reply appears while it is still being written.
    /// </summary>
    [HttpPost("chat/stream")]
    [EnableRateLimiting(RateLimitPolicies.OomPaulChat)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> StreamChatAsync(
        [FromBody] OomPaulChatRequest request,
        CancellationToken cancellationToken)
    {
        var result = await chatService.StartAsync(request.Message, request.SessionId, cancellationToken);

        if (result.IsFailure)
        {
            // Nothing is on the wire yet, so a refused turn is still an ordinary problem
            // response rather than an error frame.
            return Result.Failure(result.Error!).ToActionResult();
        }

        Response.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";

        // nginx buffers a response body by default, which holds every frame back until the
        // turn is over and defeats the point of streaming it.
        Response.Headers["X-Accel-Buffering"] = "no";

        // First, so the browser can persist the session before any text arrives and keep
        // the conversation going even if the turn then fails.
        await WriteFrameAsync(new { kind = "session", sessionId = result.Value.SessionId }, cancellationToken);

        await foreach (var chatEvent in result.Value.Events)
        {
            object frame = chatEvent.Kind switch
            {
                OomPaulChatEventKind.Delta => new { kind = "delta", text = chatEvent.Value },
                OomPaulChatEventKind.Error => new { kind = "error", code = chatEvent.Value },
                _ => new { kind = "done" }
            };

            await WriteFrameAsync(frame, cancellationToken);
        }

        return new EmptyResult();
    }

    private async Task WriteFrameAsync(object frame, CancellationToken cancellationToken)
    {
        // JSON escapes the newlines inside a reply, so one frame is always one data line.
        await Response.WriteAsync(
            $"data: {JsonSerializer.Serialize(frame, FrameSerialization)}\n\n", cancellationToken);

        await Response.Body.FlushAsync(cancellationToken);
    }
}
