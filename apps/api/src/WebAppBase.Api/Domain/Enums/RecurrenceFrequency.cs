namespace WebAppBase.Api.Domain.Enums;

/// <summary>
/// Supported event repetition. Deliberately limited to weekday-based repetition —
/// full RRULE semantics and exclusion lists are out of scope.
/// </summary>
public enum RecurrenceFrequency
{
    None = 0,
    Weekly = 1,
    Monthly = 2
}
