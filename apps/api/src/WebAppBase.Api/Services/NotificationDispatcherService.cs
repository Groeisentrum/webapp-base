using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebAppBase.Api.Configuration;
using WebAppBase.Api.Data;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Enums;

namespace WebAppBase.Api.Services;

/// <summary>
/// Drains queued notifications and hands them to Posduif.
/// </summary>
/// <remarks>
/// A failed send is marked Failed and left alone rather than retried: ecosystem
/// convention is to fail fast and let an operator decide, and a silent retry loop
/// would risk duplicate notifications.
/// </remarks>
public sealed class NotificationDispatcherService(
    IServiceScopeFactory scopeFactory,
    IOptions<PosduifOptions> options,
    IClock clock,
    ILogger<NotificationDispatcherService> logger) : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(30);
    private const int BatchSize = 20;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.Enabled)
        {
            logger.LogInformation("Posduif dispatch is disabled; queued notifications will not be sent.");
            return;
        }

        using var timer = new PeriodicTimer(PollInterval);

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await DispatchPendingBatchAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                // Keep the dispatcher alive: one bad batch must not stop all future sends.
                logger.LogError(exception, "Notification dispatch batch failed.");
            }
        }
    }

    private async Task DispatchPendingBatchAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<WebAppDbContext>();
        var posduifClient = scope.ServiceProvider.GetRequiredService<IPosduifClient>();

        var pending = await dbContext.NotificationLogs
            .Where(notification => notification.Status == NotificationStatus.Pending)
            .OrderBy(notification => notification.CreatedAt)
            .Take(BatchSize)
            .ToListAsync(cancellationToken);

        if (pending.Count == 0)
        {
            return;
        }

        foreach (var notification in pending)
        {
            await SendOneAsync(posduifClient, notification, cancellationToken);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task SendOneAsync(
        IPosduifClient posduifClient,
        NotificationLog notification,
        CancellationToken cancellationToken)
    {
        try
        {
            await posduifClient.SendAsync(notification.NotificationType, notification.ContentId, cancellationToken);
            notification.Status = NotificationStatus.Sent;
            notification.SentAt = clock.UtcNow;
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            notification.Status = NotificationStatus.Failed;
            notification.Error = exception.Message;
            logger.LogWarning(
                exception,
                "Failed to dispatch notification {NotificationId} of type {NotificationType}.",
                notification.Id,
                notification.NotificationType);
        }
    }
}
