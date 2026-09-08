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
/// Self-registration for site visitors, who receive the Client role.
/// </summary>
/// <remarks>
/// Anonymous by necessity and rate limited by consequence: this is the one public
/// endpoint that creates records in an upstream system, so it is the obvious target
/// for automated abuse.
/// </remarks>
[ApiController]
[Route("api/public/registration")]
[AllowAnonymous]
public sealed class RegistrationController(RegistrationService registrationService) : ControllerBase
{
    /// <summary>Lets the site decide whether to offer a registration link at all.</summary>
    [HttpGet("availability")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<RegistrationAvailabilityResponse>> GetAvailabilityAsync(
        CancellationToken cancellationToken)
    {
        var result = await registrationService.GetAvailabilityAsync(cancellationToken);

        return result.ToActionResult();
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitPolicies.Registration)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<RegistrationResponse>> RegisterAsync(
        [FromBody] RegisterClientRequest request,
        CancellationToken cancellationToken)
    {
        var result = await registrationService.RegisterAsync(
            request,
            ResolveClientIpAddress(),
            Request.Headers.UserAgent.ToString(),
            cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Prefers the forwarded address, since the API only ever sees nginx's own address
    /// otherwise. Takes the first hop, which is the client as the proxy saw it.
    /// </summary>
    private string? ResolveClientIpAddress()
    {
        var forwardedFor = Request.Headers["X-Forwarded-For"].ToString();

        if (!string.IsNullOrWhiteSpace(forwardedFor))
        {
            return forwardedFor.Split(',', StringSplitOptions.TrimEntries)[0];
        }

        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}
