namespace WebAppBase.Api.Models.Responses;

/// <summary>
/// Geographic detail attached to a content item, as the admin surface sees it.
/// </summary>
public sealed record LocationDetailResponse(
    long Id,
    long ContentId,
    decimal Latitude,
    decimal Longitude,
    string? Label,
    string? AddressLine,
    string? Notes,
    long? TourStopId,
    long? ArAnchorId,
    long? NfcTagId);

/// <summary>
/// A point of interest as the public map and itinerary features consume it.
/// </summary>
/// <remarks>
/// This is a published contract. The map and itinerary features both read it, so
/// fields are added but never renamed or removed without telling both consumers.
///
/// It flattens the content/category/location join so a consumer drawing pins needs
/// one call rather than three. <paramref name="Name"/> and
/// <paramref name="ShortDescription"/> arrive already resolved into the requested
/// language, falling back to the deployment's default language rather than going
/// blank when a translation is missing.
/// </remarks>
public sealed record PublicLocationResponse(
    long Id,
    long ContentId,
    string Name,
    string? ShortDescription,
    long CategoryId,
    string CategoryName,
    string CategorySlug,
    string? CategoryColour,
    string? PhotoReference,
    decimal Latitude,
    decimal Longitude,
    string? AddressLine,
    long? TourStopId,
    long? ArAnchorId,
    long? NfcTagId);
