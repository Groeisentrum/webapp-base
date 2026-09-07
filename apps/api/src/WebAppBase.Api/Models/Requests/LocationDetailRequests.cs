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
}
