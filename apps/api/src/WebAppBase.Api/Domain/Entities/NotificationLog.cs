using WebAppBase.Api.Domain.Enums;

namespace WebAppBase.Api.Domain.Entities;

/// <summary>
/// Record of an outbound Posduif dispatch, kept so a failed notification is
/// visible rather than silently lost. Dispatch is best-effort and never blocks
/// the mutation that triggered it.
/// </summary>
public class NotificationLog
{
    public long Id { get; set; }

    public long? ContentId { get; set; }

    public string NotificationType { get; set; } = string.Empty;

    public NotificationStatus Status { get; set; } = NotificationStatus.None;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? SentAt { get; set; }

    /// <summary>Failure detail for operators. Never surfaced to end users.</summary>
    public string? Error { get; set; }
}
