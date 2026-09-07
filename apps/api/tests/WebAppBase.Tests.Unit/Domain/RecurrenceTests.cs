using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Domain.ValueObjects;

namespace WebAppBase.Tests.Unit.Domain;

public sealed class RecurrenceTests
{
    [Fact]
    public void None_IsValid()
    {
        var recurrence = Recurrence.None();

        recurrence.IsValid().Should().BeTrue();
    }

    [Fact]
    public void None_WithWeekdaySet_IsInvalid()
    {
        var recurrence = new Recurrence
        {
            Frequency = RecurrenceFrequency.None,
            DayOfWeek = DayOfWeek.Monday
        };

        recurrence.IsValid().Should().BeFalse();
    }

    [Fact]
    public void Weekly_WithWeekday_IsValid()
    {
        var recurrence = new Recurrence
        {
            Frequency = RecurrenceFrequency.Weekly,
            DayOfWeek = DayOfWeek.Tuesday
        };

        recurrence.IsValid().Should().BeTrue();
    }

    [Fact]
    public void Weekly_WithoutWeekday_IsInvalid()
    {
        var recurrence = new Recurrence { Frequency = RecurrenceFrequency.Weekly };

        recurrence.IsValid().Should().BeFalse();
    }

    [Fact]
    public void Weekly_WithWeekOfMonth_IsInvalid()
    {
        var recurrence = new Recurrence
        {
            Frequency = RecurrenceFrequency.Weekly,
            DayOfWeek = DayOfWeek.Tuesday,
            WeekOfMonth = WeekOfMonth.Second
        };

        recurrence.IsValid().Should().BeFalse();
    }

    [Fact]
    public void Monthly_WithWeekdayAndWeekOfMonth_IsValid()
    {
        var recurrence = new Recurrence
        {
            Frequency = RecurrenceFrequency.Monthly,
            DayOfWeek = DayOfWeek.Thursday,
            WeekOfMonth = WeekOfMonth.Last
        };

        recurrence.IsValid().Should().BeTrue();
    }

    [Fact]
    public void Monthly_WithoutWeekOfMonth_IsInvalid()
    {
        var recurrence = new Recurrence
        {
            Frequency = RecurrenceFrequency.Monthly,
            DayOfWeek = DayOfWeek.Thursday
        };

        recurrence.IsValid().Should().BeFalse();
    }
}
