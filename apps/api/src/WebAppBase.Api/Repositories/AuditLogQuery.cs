namespace WebAppBase.Api.Repositories;

/// <summary>
/// Filters for an audit trail listing.
/// </summary>
public sealed record AuditLogQuery(
    string? EntityType,
    long? EntityId,
    string? ActorUserId,
    DateTimeOffset? OccurredFrom,
    DateTimeOffset? OccurredTo,
    int Page,
    int PageSize);
