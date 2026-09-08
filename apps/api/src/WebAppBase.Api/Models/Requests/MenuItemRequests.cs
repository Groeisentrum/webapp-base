using System.ComponentModel.DataAnnotations;
using WebAppBase.Api.Domain.Enums;

namespace WebAppBase.Api.Models.Requests;

/// <summary>
/// Creates a navigation entry. Which target field is required depends on <see cref="LinkType"/>.
/// </summary>
public sealed class CreateMenuItemRequest
{
    [Required]
    public MenuType MenuType { get; set; } = MenuType.None;

    [Required]
    public MenuLinkType LinkType { get; set; } = MenuLinkType.None;

    [Required]
    [MaxLength(200)]
    public string Label { get; set; } = string.Empty;

    public long? CategoryId { get; set; }

    [MaxLength(200)]
    public string? StaticPageSlug { get; set; }

    [MaxLength(2048)]
    public string? ExternalUrl { get; set; }

    public long? ParentMenuItemId { get; set; }

    public int SortOrder { get; set; }

    /// <summary>Who may see this. Restricting it also hides everything beneath it.</summary>
    public Visibility Visibility { get; set; } = Visibility.Public;

    /// <summary>Roles admitted when Visibility is Restricted.</summary>
    public IReadOnlyList<string> VisibleToRoles { get; set; } = [];
}

/// <summary>
/// Updates a navigation entry.
/// </summary>
public sealed class UpdateMenuItemRequest
{
    [Required]
    public MenuType MenuType { get; set; } = MenuType.None;

    [Required]
    public MenuLinkType LinkType { get; set; } = MenuLinkType.None;

    [Required]
    [MaxLength(200)]
    public string Label { get; set; } = string.Empty;

    public long? CategoryId { get; set; }

    [MaxLength(200)]
    public string? StaticPageSlug { get; set; }

    [MaxLength(2048)]
    public string? ExternalUrl { get; set; }

    public long? ParentMenuItemId { get; set; }

    public int SortOrder { get; set; }

    /// <summary>Who may see this. Restricting it also hides everything beneath it.</summary>
    public Visibility Visibility { get; set; } = Visibility.Public;

    /// <summary>Roles admitted when Visibility is Restricted.</summary>
    public IReadOnlyList<string> VisibleToRoles { get; set; } = [];
}
