using WebAppBase.Api.Domain.Enums;

namespace WebAppBase.Api.Models.Responses;

/// <summary>
/// A content item as returned to admin clients.
/// </summary>
public sealed record ContentResponse(
    long Id,
    long CategoryId,
    string Title,
    string? Description,
    string? Body,
    AssetType AssetType,
    string? AssetReference,
    DateTimeOffset? PublishedAt,
    DateTimeOffset? UnpublishedAt,
    DateTimeOffset? EventStart,
    DateTimeOffset? EventEnd,
    RecurrenceResponse Recurrence,
    Visibility Visibility,
    IReadOnlyList<string> VisibleToRoles,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public sealed record RecurrenceResponse(
    RecurrenceFrequency Frequency,
    DayOfWeek? DayOfWeek,
    WeekOfMonth? WeekOfMonth);

/// <summary>
/// A content item as shown to site visitors, with text resolved into the requested
/// language and locations attached.
/// </summary>
public sealed record PublicContentResponse(
    long Id,
    long CategoryId,
    string Title,
    string? Description,
    string? Body,
    AssetType AssetType,
    string? AssetReference,
    DateTimeOffset? EventStart,
    DateTimeOffset? EventEnd,
    RecurrenceResponse Recurrence,
    IReadOnlyList<LocationDetailResponse> Locations);
