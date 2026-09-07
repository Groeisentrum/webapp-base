namespace WebAppBase.Api.Domain.Entities;

/// <summary>
/// A node in the admin-configured content hierarchy. Both top-level sections and
/// their children are rows here — the template hardcodes no section list.
/// </summary>
public class Category : AuditableEntity
{
    public long? ParentCategoryId { get; set; }

    /// <summary>Name in the deployment's default language; other languages live in translations.</summary>
    public string Name { get; set; } = string.Empty;

    public string Slug { get; set; } = string.Empty;

    public string? Colour { get; set; }

    public string? Icon { get; set; }

    public int SortOrder { get; set; }

    public Category? ParentCategory { get; set; }

    public ICollection<Category> ChildCategories { get; set; } = [];

    public ICollection<Content> ContentItems { get; set; } = [];
}
