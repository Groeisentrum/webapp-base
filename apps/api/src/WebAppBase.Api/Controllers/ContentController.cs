using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Extensions;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Api.Repositories;
using WebAppBase.Api.Services;

namespace WebAppBase.Api.Controllers;

/// <summary>
/// Content management. Listings here are unfiltered by publish window so editors
/// can see drafts and expired items; the public endpoints filter instead.
/// </summary>
[ApiController]
[Route("api/content")]
[Authorize(Policy = PolicyNames.ContentManagement)]
public sealed class ContentController(ContentService contentService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResponse<ContentResponse>>> SearchAsync(
        [FromQuery] long? categoryId,
        [FromQuery] string? search,
        [FromQuery] int page = PagingDefaults.FirstPage,
        [FromQuery] int pageSize = PagingDefaults.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var query = new ContentQuery(
            categoryId,
            null,
            search,
            PagingDefaults.NormalisePage(page),
            PagingDefaults.NormalisePageSize(pageSize));

        var result = await contentService.SearchAsync(query, cancellationToken);

        return Ok(result);
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ContentResponse>> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        var result = await contentService.GetByIdAsync(id, cancellationToken);

        return result.ToActionResult();
    }

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ContentResponse>> CreateAsync(
        [FromBody] CreateContentRequest request,
        CancellationToken cancellationToken)
    {
        var result = await contentService.CreateAsync(request, cancellationToken);

        return result.IsSuccess
            ? result.ToCreatedResult(nameof(GetByIdAsync), new { id = result.Value.Id })
            : result.ToActionResult();
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ContentResponse>> UpdateAsync(
        long id,
        [FromBody] UpdateContentRequest request,
        CancellationToken cancellationToken)
    {
        var result = await contentService.UpdateAsync(id, request, cancellationToken);

        return result.ToActionResult();
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var result = await contentService.DeleteAsync(id, cancellationToken);

        return result.ToActionResult();
    }
}
