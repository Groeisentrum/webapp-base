using WebAppBase.Api.Domain.Enums;

namespace WebAppBase.Api.Domain.ValueObjects;

/// <summary>
/// Weekday-based event repetition. Weekly repeats on <see cref="DayOfWeek"/>;
/// monthly repeats on the <see cref="WeekOfMonth"/> occurrence of that weekday.
/// Exclusions and full RRULE semantics are intentionally unsupported.
/// </summary>
public sealed class Recurrence
{
    public RecurrenceFrequency Frequency { get; init; } = RecurrenceFrequency.None;

    public DayOfWeek? DayOfWeek { get; init; }

    public WeekOfMonth? WeekOfMonth { get; init; }

    public static Recurrence None() => new();

    /// <summary>
    /// True when the combination of frequency, weekday and week-of-month is coherent.
    /// </summary>
    public bool IsValid() => Frequency switch
    {
        RecurrenceFrequency.None => DayOfWeek is null && WeekOfMonth is null,
        RecurrenceFrequency.Weekly => DayOfWeek is not null && WeekOfMonth is null,
        RecurrenceFrequency.Monthly => DayOfWeek is not null && WeekOfMonth is not null and not Enums.WeekOfMonth.None,
        _ => false
    };
}
