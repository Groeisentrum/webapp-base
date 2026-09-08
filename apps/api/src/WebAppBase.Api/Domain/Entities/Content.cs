using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Domain.ValueObjects;

namespace WebAppBase.Api.Domain.Entities;

/// <summary>
/// A publishable item within a category.
/// </summary>
/// <remarks>
/// The publish window (<see cref="PublishedAt"/>/<see cref="UnpublishedAt"/>) and the
/// event window (<see cref="EventStart"/>/<see cref="EventEnd"/>) are independent:
/// an event may be advertised long before it happens and stay visible afterwards.
/// </remarks>
public class Content : AuditableEntity
{
    public long CategoryId { get; set; }

    /// <summary>
    /// Can only narrow what the owning category already allows, never widen it.
    /// </summary>
    public Visibility Visibility { get; set; } = Visibility.Public;

    /// <summary>Roles admitted when <see cref="Visibility"/> is Restricted.</summary>
    public IReadOnlyList<string> VisibleToRoles { get; set; } = [];

    public AssetType AssetType { get; set; } = AssetType.None;

    /// <summary>URL, storage key or embed id — interpreted according to <see cref="AssetType"/>.</summary>
    public string? AssetReference { get; set; }

    /// <summary>Title in the deployment's default language; other languages live in translations.</summary>
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? Body { get; set; }

    /// <summary>When the item becomes visible on the site. Null means never published.</summary>
    public DateTimeOffset? PublishedAt { get; set; }

    /// <summary>When the item stops being visible. Null means it stays visible once published.</summary>
    public DateTimeOffset? UnpublishedAt { get; set; }

    public DateTimeOffset? EventStart { get; set; }

    public DateTimeOffset? EventEnd { get; set; }

    public Recurrence Recurrence { get; set; } = Recurrence.None();

    public Category? Category { get; set; }

    public ICollection<LocationDetail> LocationDetails { get; set; } = [];

    /// <summary>True when the publish window contains the supplied instant.</summary>
    public bool IsVisibleAt(DateTimeOffset instant) =>
        PublishedAt is not null
        && PublishedAt <= instant
        && (UnpublishedAt is null || UnpublishedAt > instant);
}
