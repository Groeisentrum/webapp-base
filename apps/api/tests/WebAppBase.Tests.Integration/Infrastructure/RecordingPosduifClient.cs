using WebAppBase.Api.Services;

namespace WebAppBase.Tests.Integration.Infrastructure;

/// <summary>
/// Captures dispatch attempts instead of calling Posduif, so tests never reach the network.
/// </summary>
public sealed class RecordingPosduifClient : IPosduifClient
{
    private readonly List<(string NotificationType, long? ContentId)> sent = [];

    public IReadOnlyList<(string NotificationType, long? ContentId)> Sent
    {
        get
        {
            lock (sent)
            {
                return [.. sent];
            }
        }
    }

    public Task SendAsync(string notificationType, long? contentId, CancellationToken cancellationToken)
    {
        lock (sent)
        {
            sent.Add((notificationType, contentId));
        }

        return Task.CompletedTask;
    }
}
