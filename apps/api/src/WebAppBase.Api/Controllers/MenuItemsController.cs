using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Extensions;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Api.Services;

namespace WebAppBase.Api.Controllers;

/// <summary>
/// Navigation entries across the site's menu surfaces.
/// </summary>
[ApiController]
[Route("api/menu-items")]
[Authorize(Policy = PolicyNames.ContentManagement)]
public sealed class MenuItemsController(MenuItemService menuItemService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<MenuItemResponse>>> GetAsync(
        [FromQuery] MenuType? menuType,
        CancellationToken cancellationToken)
    {
        var menuItems = await menuItemService.GetAsync(menuType, cancellationToken);

        return Ok(menuItems);
    }

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MenuItemResponse>> CreateAsync(
        [FromBody] CreateMenuItemRequest request,
        CancellationToken cancellationToken)
    {
        var result = await menuItemService.CreateAsync(request, cancellationToken);

        return result.IsSuccess
            ? result.ToCreatedResult(nameof(GetAsync), new { id = result.Value.Id })
            : result.ToActionResult();
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MenuItemResponse>> UpdateAsync(
        long id,
        [FromBody] UpdateMenuItemRequest request,
        CancellationToken cancellationToken)
    {
        var result = await menuItemService.UpdateAsync(id, request, cancellationToken);

        return result.ToActionResult();
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var result = await menuItemService.DeleteAsync(id, cancellationToken);

        return result.ToActionResult();
    }
}
