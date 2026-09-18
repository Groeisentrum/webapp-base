using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using WebAppBase.Api.Domain.Constants;
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
    [HttpPost("chat")]
    [EnableRateLimiting(RateLimitPolicies.OomPaulChat)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<OomPaulChatResponse>> ChatAsync(
        [FromBody] OomPaulChatRequest request,
        CancellationToken cancellationToken)
    {
        var result = await chatService.SendAsync(request.Message, request.SessionId, cancellationToken);

        return result.ToActionResult();
    }
}
