using WebAppBase.Api.Domain.Enums;

namespace WebAppBase.Api.Models.Responses;

/// <summary>
/// A navigation entry.
/// </summary>
public sealed record MenuItemResponse(
    long Id,
    MenuType MenuType,
    MenuLinkType LinkType,
    string Label,
    long? CategoryId,
    string? StaticPageSlug,
    string? ExternalUrl,
    long? ParentMenuItemId,
    int SortOrder,
    Visibility Visibility,
    IReadOnlyList<string> VisibleToRoles,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);
