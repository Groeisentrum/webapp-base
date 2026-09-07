namespace WebAppBase.Api.Models.Responses;

/// <summary>
/// A category as returned to admin clients, flat rather than nested.
/// </summary>
public sealed record CategoryResponse(
    long Id,
    long? ParentCategoryId,
    string Name,
    string Slug,
    string? Colour,
    string? Icon,
    int SortOrder,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

/// <summary>
/// A category with its descendants attached, for rendering navigation and pickers.
/// </summary>
public sealed record CategoryTreeNodeResponse(
    long Id,
    long? ParentCategoryId,
    string Name,
    string Slug,
    string? Colour,
    string? Icon,
    int SortOrder,
    IReadOnlyList<CategoryTreeNodeResponse> Children);
