using WebAppBase.Api.Domain.Enums;

namespace WebAppBase.Api.Domain.Entities;

/// <summary>
/// An immutable record of a mutation to configuration or content. Append-only:
/// audit rows are never updated or soft-deleted, so this does not derive from
/// <see cref="AuditableEntity"/>.
/// </summary>
public class AuditLog
{
    public long Id { get; set; }

    /// <summary>Discriminator from <c>EntityTypeNames</c>.</summary>
    public string EntityType { get; set; } = string.Empty;

    public long EntityId { get; set; }

    public AuditAction Action { get; set; } = AuditAction.None;

    public string? ActorUserId { get; set; }

    public string? ActorEmail { get; set; }

    /// <summary>Serialised prior state. Null for creations.</summary>
    public string? OldValues { get; set; }

    /// <summary>Serialised resulting state. Null for deletions.</summary>
    public string? NewValues { get; set; }

    public DateTimeOffset OccurredAt { get; set; }
}
