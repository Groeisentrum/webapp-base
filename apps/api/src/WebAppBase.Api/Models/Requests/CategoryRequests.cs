using System.ComponentModel.DataAnnotations;
using WebAppBase.Api.Domain.Enums;

namespace WebAppBase.Api.Models.Requests;

/// <summary>
/// Creates a category. Admin only.
/// </summary>
public sealed class CreateCategoryRequest
{
    public long? ParentCategoryId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Slug { get; set; } = string.Empty;

    [MaxLength(32)]
    public string? Colour { get; set; }

    [MaxLength(100)]
    public string? Icon { get; set; }

    public int SortOrder { get; set; }

    /// <summary>Who may see this. Restricting it also hides everything beneath it.</summary>
    public Visibility Visibility { get; set; } = Visibility.Public;

    /// <summary>Roles admitted when Visibility is Restricted.</summary>
    public IReadOnlyList<string> VisibleToRoles { get; set; } = [];
}

/// <summary>
/// Updates a category, including moving it within the hierarchy. Admin only.
/// </summary>
public sealed class UpdateCategoryRequest
{
    public long? ParentCategoryId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Slug { get; set; } = string.Empty;

    [MaxLength(32)]
    public string? Colour { get; set; }

    [MaxLength(100)]
    public string? Icon { get; set; }

    public int SortOrder { get; set; }

    /// <summary>Who may see this. Restricting it also hides everything beneath it.</summary>
    public Visibility Visibility { get; set; } = Visibility.Public;

    /// <summary>Roles admitted when Visibility is Restricted.</summary>
    public IReadOnlyList<string> VisibleToRoles { get; set; } = [];
}
