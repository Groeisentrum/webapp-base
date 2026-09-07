using WebAppBase.Api.Domain.Enums;

namespace WebAppBase.Api.Domain.Entities;

/// <summary>
/// An entry in one of the site's navigation surfaces. Menus are admin-configured
/// rather than hardcoded routes, so a deployment can restructure navigation without a release.
/// </summary>
public class MenuItem : AuditableEntity
{
    public MenuType MenuType { get; set; } = MenuType.None;

    public MenuLinkType LinkType { get; set; } = MenuLinkType.None;

    /// <summary>Label in the deployment's default language; other languages live in translations.</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>Set when <see cref="LinkType"/> is <see cref="MenuLinkType.Category"/>.</summary>
    public long? CategoryId { get; set; }

    /// <summary>Set when <see cref="LinkType"/> is <see cref="MenuLinkType.StaticPage"/>.</summary>
    public string? StaticPageSlug { get; set; }

    /// <summary>Set when <see cref="LinkType"/> is <see cref="MenuLinkType.ExternalLink"/>.</summary>
    public string? ExternalUrl { get; set; }

    public long? ParentMenuItemId { get; set; }

    public int SortOrder { get; set; }

    public Category? Category { get; set; }

    public MenuItem? ParentMenuItem { get; set; }

    public ICollection<MenuItem> ChildMenuItems { get; set; } = [];
}
