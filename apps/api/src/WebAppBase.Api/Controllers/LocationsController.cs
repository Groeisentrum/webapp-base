using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Extensions;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Api.Services;

namespace WebAppBase.Api.Controllers;

/// <summary>
/// Geographic detail attached to content items.
/// </summary>
[ApiController]
[Route("api/locations")]
[Authorize(Policy = PolicyNames.ContentManagement)]
public sealed class LocationsController(LocationDetailService locationDetailService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<LocationDetailResponse>>> GetForContentAsync(
        [FromQuery] long contentId,
        CancellationToken cancellationToken)
    {
        var locations = await locationDetailService.GetForContentAsync(contentId, cancellationToken);

        return Ok(locations);
    }

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<LocationDetailResponse>> CreateAsync(
        [FromBody] CreateLocationDetailRequest request,
        CancellationToken cancellationToken)
    {
        var result = await locationDetailService.CreateAsync(request, cancellationToken);

        return result.IsSuccess
            ? result.ToCreatedResult(nameof(GetForContentAsync), new { contentId = result.Value.ContentId })
            : result.ToActionResult();
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LocationDetailResponse>> UpdateAsync(
        long id,
        [FromBody] UpdateLocationDetailRequest request,
        CancellationToken cancellationToken)
    {
        var result = await locationDetailService.UpdateAsync(id, request, cancellationToken);

        return result.ToActionResult();
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var result = await locationDetailService.DeleteAsync(id, cancellationToken);

        return result.ToActionResult();
    }
}
