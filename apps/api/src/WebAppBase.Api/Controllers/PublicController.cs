using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Extensions;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Api.Services;

namespace WebAppBase.Api.Controllers;

/// <summary>
/// What site visitors can read without signing in.
/// </summary>
/// <remarks>
/// Every endpoint here filters to the current publish window, so drafts and expired
/// items are invisible — including by direct id, which reports missing rather than
/// forbidden so the existence of a draft is not disclosed.
/// </remarks>
[ApiController]
[Route("api/public")]
[AllowAnonymous]
public sealed class PublicController(
    PublicContentService publicContentService,
    TenantSettingsService tenantSettingsService) : ControllerBase
{
    [HttpGet("site-config")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicSiteConfigResponse>> GetSiteConfigAsync(CancellationToken cancellationToken)
    {
        var result = await tenantSettingsService.GetPublicConfigAsync(cancellationToken);

        return result.ToActionResult();
    }

    [HttpGet("categories")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<CategoryTreeNodeResponse>>> GetCategoriesAsync(
        [FromQuery] string? language,
        CancellationToken cancellationToken)
    {
        var result = await publicContentService.GetCategoryTreeAsync(language, cancellationToken);

        return result.ToActionResult();
    }

    [HttpGet("content")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResponse<PublicContentResponse>>> SearchContentAsync(
        [FromQuery] long? categoryId,
        [FromQuery] string? language,
        [FromQuery] string? search,
        [FromQuery] int page = PagingDefaults.FirstPage,
        [FromQuery] int pageSize = PagingDefaults.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var result = await publicContentService.SearchAsync(
            categoryId,
            language,
            search,
            PagingDefaults.NormalisePage(page),
            PagingDefaults.NormalisePageSize(pageSize),
            cancellationToken);

        return result.ToActionResult();
    }

    [HttpGet("content/{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicContentResponse>> GetContentByIdAsync(
        long id,
        [FromQuery] string? language,
        CancellationToken cancellationToken)
    {
        var result = await publicContentService.GetByIdAsync(id, language, cancellationToken);

        return result.ToActionResult();
    }

    [HttpGet("menu-items")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<MenuItemResponse>>> GetMenuItemsAsync(
        [FromQuery] MenuType? menuType,
        [FromQuery] string? language,
        CancellationToken cancellationToken)
    {
        var result = await publicContentService.GetMenuItemsAsync(menuType, language, cancellationToken);

        return result.ToActionResult();
    }
}
