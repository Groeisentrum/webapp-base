using WebAppBase.Api.Data;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Enums;

namespace WebAppBase.Api.Services;

/// <inheritdoc />
public sealed class NotificationService(WebAppDbContext dbContext, IClock clock) : INotificationService
{
    public void Queue(string notificationType, long? contentId)
    {
        var notification = new NotificationLog
        {
            NotificationType = notificationType,
            ContentId = contentId,
            Status = NotificationStatus.Pending,
            CreatedAt = clock.UtcNow
        };

        dbContext.NotificationLogs.Add(notification);
    }
}
