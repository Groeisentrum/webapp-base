namespace WebAppBase.Api.Services;

/// <summary>
/// Sends a single notification to Posduif. Implementations fail fast — there is no
/// retry or circuit breaker at this layer, matching ecosystem convention. The
/// dispatcher decides what happens to a failed send.
/// </summary>
public interface IPosduifClient
{
    Task SendAsync(string notificationType, long? contentId, CancellationToken cancellationToken);
}
