using System.ComponentModel.DataAnnotations;

namespace WebAppBase.Api.Models.Requests;

/// <summary>
/// Attaches geographic detail to a content item.
/// </summary>
public sealed class CreateLocationDetailRequest
{
    [Required]
    public long ContentId { get; set; }

    [Range(-90, 90)]
    public decimal Latitude { get; set; }

    [Range(-180, 180)]
    public decimal Longitude { get; set; }

    [MaxLength(200)]
    public string? Label { get; set; }

    [MaxLength(500)]
    public string? AddressLine { get; set; }

    [MaxLength(2000)]
    public string? Notes { get; set; }

    /// <summary>Optional link to a tour stop; stays null until tours exist.</summary>
    public long? TourStopId { get; set; }

    /// <summary>Optional link to an AR anchor; stays null until AR exists.</summary>
    public long? ArAnchorId { get; set; }

    /// <summary>Optional link to an NFC tag; stays null until tags are placed.</summary>
    public long? NfcTagId { get; set; }
}

/// <summary>
/// Updates geographic detail.
/// </summary>
public sealed class UpdateLocationDetailRequest
{
    [Range(-90, 90)]
    public decimal Latitude { get; set; }

    [Range(-180, 180)]
    public decimal Longitude { get; set; }

    [MaxLength(200)]
    public string? Label { get; set; }

    [MaxLength(500)]
    public string? AddressLine { get; set; }

    [MaxLength(2000)]
    public string? Notes { get; set; }

    public long? TourStopId { get; set; }

    public long? ArAnchorId { get; set; }

    public long? NfcTagId { get; set; }
}
