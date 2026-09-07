using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Extensions;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Api.Services;

namespace WebAppBase.Api.Controllers;

/// <summary>
/// Deployment configuration. Admin only — these settings define the site's shape.
/// </summary>
[ApiController]
[Route("api/tenant-settings")]
[Authorize(Policy = PolicyNames.AdminOnly)]
public sealed class TenantSettingsController(TenantSettingsService tenantSettingsService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TenantSettingsResponse>> GetAsync(CancellationToken cancellationToken)
    {
        var result = await tenantSettingsService.GetAsync(cancellationToken);

        return result.ToActionResult();
    }

    [HttpPut]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TenantSettingsResponse>> UpdateAsync(
        [FromBody] UpdateTenantSettingsRequest request,
        CancellationToken cancellationToken)
    {
        var result = await tenantSettingsService.UpdateAsync(request, cancellationToken);

        return result.ToActionResult();
    }
}
