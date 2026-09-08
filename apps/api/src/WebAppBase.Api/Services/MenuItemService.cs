using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Api.Repositories;

namespace WebAppBase.Api.Services;

/// <summary>
/// Manages the admin-configurable navigation surfaces.
/// </summary>
public sealed class MenuItemService(
    IMenuItemRepository menuItemRepository,
    ICategoryRepository categoryRepository,
    IAuditService auditService,
    IUnitOfWork unitOfWork,
    IClock clock)
{
    public async Task<IReadOnlyList<MenuItemResponse>> GetAsync(
        MenuType? menuType,
        CancellationToken cancellationToken)
    {
        var menuItems = await menuItemRepository.GetAsync(menuType, cancellationToken);

        return [.. menuItems.Select(MapResponse)];
    }

    public async Task<Result<MenuItemResponse>> CreateAsync(
        CreateMenuItemRequest request,
        CancellationToken cancellationToken)
    {
        var targetError = await ValidateTargetAsync(
            request.LinkType,
            request.CategoryId,
            request.StaticPageSlug,
            request.ExternalUrl,
            cancellationToken);

        if (targetError is not null)
        {
            return Result<MenuItemResponse>.Failure(targetError);
        }

        var menuItem = new MenuItem
        {
            MenuType = request.MenuType,
            LinkType = request.LinkType,
            Label = request.Label,
            CategoryId = request.CategoryId,
            StaticPageSlug = request.StaticPageSlug,
            ExternalUrl = request.ExternalUrl,
            ParentMenuItemId = request.ParentMenuItemId,
            SortOrder = request.SortOrder,
            Visibility = request.Visibility,
            VisibleToRoles = [.. request.VisibleToRoles],
            CreatedAt = clock.UtcNow
        };

        menuItemRepository.Add(menuItem);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        auditService.Record(EntityTypeNames.MenuItem, menuItem.Id, AuditAction.Created, null, MapResponse(menuItem));
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<MenuItemResponse>.Success(MapResponse(menuItem));
    }

    public async Task<Result<MenuItemResponse>> UpdateAsync(
        long id,
        UpdateMenuItemRequest request,
        CancellationToken cancellationToken)
    {
        var targetError = await ValidateTargetAsync(
            request.LinkType,
            request.CategoryId,
            request.StaticPageSlug,
            request.ExternalUrl,
            cancellationToken);

        if (targetError is not null)
        {
            return Result<MenuItemResponse>.Failure(targetError);
        }

        var menuItem = await menuItemRepository.GetByIdAsync(id, cancellationToken);
        if (menuItem is null)
        {
            return Result<MenuItemResponse>.Failure(MenuItemNotFound());
        }

        if (request.ParentMenuItemId == id)
        {
            return Result<MenuItemResponse>.Failure(Error.Validation(
                ErrorCodes.InvalidMenuTarget,
                "'n Kieslysitem kan nie sy eie moederitem wees nie."));
        }

        var previousState = MapResponse(menuItem);

        menuItem.MenuType = request.MenuType;
        menuItem.LinkType = request.LinkType;
        menuItem.Label = request.Label;
        menuItem.CategoryId = request.CategoryId;
        menuItem.StaticPageSlug = request.StaticPageSlug;
        menuItem.ExternalUrl = request.ExternalUrl;
        menuItem.ParentMenuItemId = request.ParentMenuItemId;
        menuItem.SortOrder = request.SortOrder;
        menuItem.Visibility = request.Visibility;
        menuItem.VisibleToRoles = [.. request.VisibleToRoles];
        menuItem.UpdatedAt = clock.UtcNow;

        auditService.Record(
            EntityTypeNames.MenuItem,
            menuItem.Id,
            AuditAction.Updated,
            previousState,
            MapResponse(menuItem));

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<MenuItemResponse>.Success(MapResponse(menuItem));
    }

    public async Task<Result> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var menuItem = await menuItemRepository.GetByIdAsync(id, cancellationToken);
        if (menuItem is null)
        {
            return Result.Failure(MenuItemNotFound());
        }

        if (await menuItemRepository.HasChildMenuItemsAsync(id, cancellationToken))
        {
            return Result.Failure(Error.Conflict(
                ErrorCodes.InvalidMenuTarget,
                "Hierdie kieslysitem het subitems. Verwyder hulle eers."));
        }

        var previousState = MapResponse(menuItem);

        menuItem.IsDeleted = true;
        menuItem.UpdatedAt = clock.UtcNow;

        auditService.Record(EntityTypeNames.MenuItem, menuItem.Id, AuditAction.Deleted, previousState, null);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    private static Error MenuItemNotFound() => Error.NotFound(
        ErrorCodes.MenuItemNotFound,
        "Die kieslysitem kon nie gevind word nie.");

    /// <summary>
    /// Each link type has exactly one meaningful target field; a mismatch would
    /// render a menu entry that points nowhere.
    /// </summary>
    private async Task<Error?> ValidateTargetAsync(
        MenuLinkType linkType,
        long? categoryId,
        string? staticPageSlug,
        string? externalUrl,
        CancellationToken cancellationToken)
    {
        switch (linkType)
        {
            case MenuLinkType.Category:
                if (categoryId is null)
                {
                    return InvalidTarget("Kies 'n kategorie vir hierdie kieslysitem.");
                }

                var category = await categoryRepository.GetByIdAsync(categoryId.Value, cancellationToken);
                return category is null
                    ? InvalidTarget("Die gekose kategorie kon nie gevind word nie.")
                    : null;

            case MenuLinkType.StaticPage:
                return string.IsNullOrWhiteSpace(staticPageSlug)
                    ? InvalidTarget("Verskaf 'n bladsyskakel vir hierdie kieslysitem.")
                    : null;

            case MenuLinkType.ExternalLink:
                return IsValidAbsoluteUrl(externalUrl)
                    ? null
                    : InvalidTarget("Verskaf 'n geldige webadres vir hierdie kieslysitem.");

            default:
                return InvalidTarget("Kies 'n geldige tipe skakel.");
        }
    }

    private static Error InvalidTarget(string message) => Error.Validation(ErrorCodes.InvalidMenuTarget, message);

    private static bool IsValidAbsoluteUrl(string? candidate) =>
        !string.IsNullOrWhiteSpace(candidate)
        && Uri.TryCreate(candidate, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);

    private static MenuItemResponse MapResponse(MenuItem menuItem) => new(
        menuItem.Id,
        menuItem.MenuType,
        menuItem.LinkType,
        menuItem.Label,
        menuItem.CategoryId,
        menuItem.StaticPageSlug,
        menuItem.ExternalUrl,
        menuItem.ParentMenuItemId,
        menuItem.SortOrder,
        menuItem.Visibility,
        menuItem.VisibleToRoles,
        menuItem.CreatedAt,
        menuItem.UpdatedAt);
}
