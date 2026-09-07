namespace WebAppBase.Api.Services;

/// <summary>
/// Supplies the current instant. Injected rather than read statically so publish
/// windows and event schedules can be tested at a chosen point in time.
/// </summary>
public interface IClock
{
    DateTimeOffset UtcNow { get; }
}

/// <inheritdoc />
public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
