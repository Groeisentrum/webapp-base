namespace WebAppBase.Api.Domain.Entities;

/// <summary>
/// Shared shape for entities that are soft-deleted and carry lifecycle timestamps.
/// Soft deletion keeps the audit trail intact and keeps instance-level backups meaningful.
/// </summary>
public abstract class AuditableEntity
{
    public long Id { get; set; }

    public bool IsDeleted { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }
}
