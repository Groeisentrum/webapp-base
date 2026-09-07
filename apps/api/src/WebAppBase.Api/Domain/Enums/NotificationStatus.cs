namespace WebAppBase.Api.Domain.Enums;

/// <summary>
/// Delivery state of an outbound Posduif notification.
/// </summary>
public enum NotificationStatus
{
    None = 0,
    Pending = 1,
    Sent = 2,
    Failed = 3
}
