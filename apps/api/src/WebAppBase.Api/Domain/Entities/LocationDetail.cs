namespace WebAppBase.Api.Domain.Entities;

/// <summary>
/// Geographic detail for content that needs a map pin. Kept as a separate row
/// rather than columns on every content item, since most content has no location.
/// </summary>
/// <remarks>
/// The point of interest's name, description, photo and category all live on the
/// owning <see cref="Content"/> row. They are deliberately not duplicated here: a
/// POI is a content item that happens to have coordinates, so translations, the
/// publish window and visibility all keep working without a second copy to maintain.
/// The public feed flattens the join for consumers that only want pins.
/// </remarks>
public class LocationDetail : AuditableEntity
{
    public long ContentId { get; set; }

    public decimal Latitude { get; set; }

    public decimal Longitude { get; set; }

    /// <summary>Overrides the content title on a map pin when a shorter form reads better.</summary>
    public string? Label { get; set; }

    public string? AddressLine { get; set; }

    public string? Notes { get; set; }

    /// <summary>
    /// Links this pin to a stop on a guided or virtual tour. Null until a tour is
    /// built. Intentionally not a foreign key yet — the tour tables do not exist, and
    /// reserving the column now means adding them later is additive rather than a
    /// schema change on a table the map and itinerary features already read.
    /// </summary>
    public long? TourStopId { get; set; }

    /// <summary>Links this pin to an augmented-reality anchor. Null until AR is built.</summary>
    public long? ArAnchorId { get; set; }

    /// <summary>Links this pin to the NFC tag planted at the location. Null until tags are placed.</summary>
    public long? NfcTagId { get; set; }

    public Content? Content { get; set; }
}
