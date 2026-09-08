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
/// Two steps: <c>start</c> records consent and emails a code, <c>complete</c> verifies
/// it and creates the account. No account exists until the address is proven.
///
/// Anonymous by necessity and rate limited by consequence: these are the only public
/// endpoints that write to an upstream system, so they are the obvious target for
/// automated abuse.
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

    /// <summary>Records consent and sends a verification code. Creates no account.</summary>
    [HttpPost("start")]
    [EnableRateLimiting(RateLimitPolicies.Registration)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<RegistrationStartedResponse>> StartAsync(
        [FromBody] RegisterClientRequest request,
        CancellationToken cancellationToken)
    {
        var result = await registrationService.StartAsync(
            request,
            ResolveClientIpAddress(),
            Request.Headers.UserAgent.ToString(),
            cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>Verifies the code and creates the account.</summary>
    [HttpPost("complete")]
    [EnableRateLimiting(RateLimitPolicies.Registration)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<RegistrationResponse>> CompleteAsync(
        [FromBody] CompleteRegistrationRequest request,
        CancellationToken cancellationToken)
    {
        var result = await registrationService.CompleteAsync(request, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>Issues a fresh code. Subject to SkaapHond's own cooldown.</summary>
    [HttpPost("resend")]
    [EnableRateLimiting(RateLimitPolicies.Registration)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<RegistrationStartedResponse>> ResendAsync(
        [FromBody] ResendRegistrationCodeRequest request,
        CancellationToken cancellationToken)
    {
        var result = await registrationService.ResendCodeAsync(request, cancellationToken);

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
