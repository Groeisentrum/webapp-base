namespace WebAppBase.Api.Models.Responses;

/// <summary>
/// Geographic detail attached to a content item.
/// </summary>
public sealed record LocationDetailResponse(
    long Id,
    long ContentId,
    decimal Latitude,
    decimal Longitude,
    string? Label,
    string? AddressLine,
    string? Notes);
