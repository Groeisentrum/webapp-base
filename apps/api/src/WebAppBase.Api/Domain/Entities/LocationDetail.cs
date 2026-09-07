namespace WebAppBase.Api.Domain.Entities;

/// <summary>
/// Geographic detail for content that needs a map pin. Kept as a separate row
/// rather than columns on every content item, since most content has no location.
/// </summary>
public class LocationDetail : AuditableEntity
{
    public long ContentId { get; set; }

    public decimal Latitude { get; set; }

    public decimal Longitude { get; set; }

    public string? Label { get; set; }

    public string? AddressLine { get; set; }

    public string? Notes { get; set; }

    public Content? Content { get; set; }
}
