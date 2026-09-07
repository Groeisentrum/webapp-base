namespace WebAppBase.Api.Services;

/// <summary>
/// Queues outbound notifications for dispatch to Posduif.
/// </summary>
/// <remarks>
/// Queuing stages a row in the same transaction as the change that triggered it, so
/// a notification is never lost to a crash between committing the change and sending.
/// A background dispatcher drains the queue; sending never blocks the request.
/// </remarks>
public interface INotificationService
{
    void Queue(string notificationType, long? contentId);
}
