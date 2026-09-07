using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Tests.Unit.Domain;

/// <summary>
/// Visibility depends only on the publish window. These tests pin that event dates
/// never influence it, since the two windows are independent by design.
/// </summary>
public sealed class ContentVisibilityTests
{
    private static readonly DateTimeOffset Now = new(2026, 3, 15, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void NeverPublished_IsNotVisible()
    {
        var content = new Content();

        content.IsVisibleAt(Now).Should().BeFalse();
    }

    [Fact]
    public void PublishedInThePast_WithNoEnd_IsVisible()
    {
        var content = new Content { PublishedAt = Now.AddDays(-1) };

        content.IsVisibleAt(Now).Should().BeTrue();
    }

    [Fact]
    public void PublishedInTheFuture_IsNotVisible()
    {
        var content = new Content { PublishedAt = Now.AddDays(1) };

        content.IsVisibleAt(Now).Should().BeFalse();
    }

    [Fact]
    public void PublishWindowElapsed_IsNotVisible()
    {
        var content = new Content
        {
            PublishedAt = Now.AddDays(-10),
            UnpublishedAt = Now.AddDays(-1)
        };

        content.IsVisibleAt(Now).Should().BeFalse();
    }

    [Fact]
    public void WithinPublishWindow_IsVisible()
    {
        var content = new Content
        {
            PublishedAt = Now.AddDays(-1),
            UnpublishedAt = Now.AddDays(1)
        };

        content.IsVisibleAt(Now).Should().BeTrue();
    }

    [Fact]
    public void PublishedAtExactInstant_IsVisible()
    {
        var content = new Content { PublishedAt = Now };

        content.IsVisibleAt(Now).Should().BeTrue();
    }

    [Fact]
    public void UnpublishedAtExactInstant_IsNotVisible()
    {
        var content = new Content
        {
            PublishedAt = Now.AddDays(-1),
            UnpublishedAt = Now
        };

        content.IsVisibleAt(Now).Should().BeFalse();
    }

    [Fact]
    public void PastEvent_StillVisibleWhilePublished()
    {
        var content = new Content
        {
            PublishedAt = Now.AddDays(-30),
            EventStart = Now.AddDays(-10),
            EventEnd = Now.AddDays(-9)
        };

        content.IsVisibleAt(Now).Should().BeTrue();
    }

    [Fact]
    public void FutureEvent_NotVisibleWhileUnpublished()
    {
        var content = new Content
        {
            EventStart = Now.AddDays(10),
            EventEnd = Now.AddDays(11)
        };

        content.IsVisibleAt(Now).Should().BeFalse();
    }
}
