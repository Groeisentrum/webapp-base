using WebAppBase.Api.Services;

namespace WebAppBase.Tests.Unit.TestDoubles;

/// <summary>
/// A clock pinned to a chosen instant so publish-window behaviour is deterministic.
/// </summary>
public sealed class FixedClock(DateTimeOffset utcNow) : IClock
{
    public static readonly DateTimeOffset DefaultInstant = new(2026, 3, 15, 12, 0, 0, TimeSpan.Zero);

    public DateTimeOffset UtcNow { get; } = utcNow;

    public static FixedClock Default() => new(DefaultInstant);
}
