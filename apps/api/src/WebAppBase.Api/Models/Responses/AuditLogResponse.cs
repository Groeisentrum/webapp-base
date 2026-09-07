using WebAppBase.Api.Domain.Enums;

namespace WebAppBase.Api.Models.Responses;

/// <summary>
/// One entry from the audit trail.
/// </summary>
public sealed record AuditLogResponse(
    long Id,
    string EntityType,
    long EntityId,
    AuditAction Action,
    string? ActorUserId,
    string? ActorEmail,
    string? OldValues,
    string? NewValues,
    DateTimeOffset OccurredAt);
