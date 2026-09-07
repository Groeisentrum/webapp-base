using NSubstitute;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Repositories;
using WebAppBase.Api.Services;
using WebAppBase.Tests.Unit.TestDoubles;

namespace WebAppBase.Tests.Unit.Services;

public sealed class ContentServiceTests
{
    private static readonly DateTimeOffset Now = FixedClock.DefaultInstant;

    private readonly IContentRepository contentRepository = Substitute.For<IContentRepository>();
    private readonly ICategoryRepository categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly IAuditService auditService = Substitute.For<IAuditService>();
    private readonly INotificationService notificationService = Substitute.For<INotificationService>();
    private readonly IUnitOfWork unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ContentService contentService;

    public ContentServiceTests()
    {
        categoryRepository.GetByIdAsync(Arg.Any<long>(), Arg.Any<CancellationToken>())
            .Returns(new Category { Id = 1, Name = "Besoek", Slug = "besoek" });

        contentService = new ContentService(
            contentRepository,
            categoryRepository,
            auditService,
            notificationService,
            unitOfWork,
            FixedClock.Default());
    }

    [Fact]
    public async Task CreateAsync_WithUnpublishBeforePublish_Fails()
    {
        var request = BuildCreateRequest();
        request.PublishedAt = Now;
        request.UnpublishedAt = Now.AddDays(-1);

        var result = await contentService.CreateAsync(request, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.InvalidPublishWindow);
    }

    [Fact]
    public async Task CreateAsync_WithUnpublishButNoPublish_Fails()
    {
        var request = BuildCreateRequest();
        request.UnpublishedAt = Now.AddDays(1);

        var result = await contentService.CreateAsync(request, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.InvalidPublishWindow);
    }

    [Fact]
    public async Task CreateAsync_WithEventEndBeforeStart_Fails()
    {
        var request = BuildCreateRequest();
        request.EventStart = Now;
        request.EventEnd = Now.AddHours(-1);

        var result = await contentService.CreateAsync(request, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.InvalidEventWindow);
    }

    /// <summary>
    /// The two windows are independent, so a past event inside a current publish
    /// window must be accepted rather than rejected as inconsistent.
    /// </summary>
    [Fact]
    public async Task CreateAsync_PublishedNowWithPastEvent_Succeeds()
    {
        var request = BuildCreateRequest();
        request.PublishedAt = Now.AddDays(-1);
        request.EventStart = Now.AddDays(-10);
        request.EventEnd = Now.AddDays(-9);

        var result = await contentService.CreateAsync(request, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
    }

    /// <summary>
    /// The mirror case: an event far in the future advertised from today.
    /// </summary>
    [Fact]
    public async Task CreateAsync_PublishedNowWithFutureEvent_Succeeds()
    {
        var request = BuildCreateRequest();
        request.PublishedAt = Now.AddDays(-1);
        request.EventStart = Now.AddMonths(6);
        request.EventEnd = Now.AddMonths(6).AddHours(2);

        var result = await contentService.CreateAsync(request, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task CreateAsync_WithIncompleteRecurrence_Fails()
    {
        var request = BuildCreateRequest();
        request.EventStart = Now;
        request.Recurrence = new RecurrenceRequest { Frequency = RecurrenceFrequency.Weekly };

        var result = await contentService.CreateAsync(request, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.InvalidRecurrence);
    }

    [Fact]
    public async Task CreateAsync_RecurringWithoutEventStart_Fails()
    {
        var request = BuildCreateRequest();
        request.Recurrence = new RecurrenceRequest
        {
            Frequency = RecurrenceFrequency.Weekly,
            DayOfWeek = DayOfWeek.Monday
        };

        var result = await contentService.CreateAsync(request, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.InvalidRecurrence);
    }

    [Fact]
    public async Task CreateAsync_WithMissingCategory_Fails()
    {
        categoryRepository.GetByIdAsync(Arg.Any<long>(), Arg.Any<CancellationToken>()).Returns((Category?)null);

        var result = await contentService.CreateAsync(BuildCreateRequest(), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(ErrorCodes.CategoryNotFound);
    }

    [Fact]
    public async Task CreateAsync_PublishedImmediately_QueuesPublishedNotification()
    {
        var request = BuildCreateRequest();
        request.PublishedAt = Now.AddMinutes(-1);

        await contentService.CreateAsync(request, CancellationToken.None);

        notificationService.Received(1).Queue(NotificationTypes.ContentPublished, Arg.Any<long?>());
    }

    [Fact]
    public async Task CreateAsync_AsDraft_QueuesNoNotification()
    {
        var result = await contentService.CreateAsync(BuildCreateRequest(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        notificationService.DidNotReceive().Queue(Arg.Any<string>(), Arg.Any<long?>());
    }

    [Fact]
    public async Task UpdateAsync_PublishingADraft_QueuesPublishedNotification()
    {
        var existing = new Content { Id = 7, CategoryId = 1, Title = "Konsep" };
        contentRepository.GetByIdAsync(7, Arg.Any<CancellationToken>()).Returns(existing);

        var request = BuildUpdateRequest();
        request.PublishedAt = Now.AddMinutes(-1);

        await contentService.UpdateAsync(7, request, CancellationToken.None);

        notificationService.Received(1).Queue(NotificationTypes.ContentPublished, 7);
    }

    [Fact]
    public async Task UpdateAsync_RetractingAPublishedItem_QueuesUnpublishedNotification()
    {
        var existing = new Content
        {
            Id = 7,
            CategoryId = 1,
            Title = "Gepubliseer",
            PublishedAt = Now.AddDays(-5)
        };
        contentRepository.GetByIdAsync(7, Arg.Any<CancellationToken>()).Returns(existing);

        var request = BuildUpdateRequest();
        request.PublishedAt = null;

        await contentService.UpdateAsync(7, request, CancellationToken.None);

        notificationService.Received(1).Queue(NotificationTypes.ContentUnpublished, 7);
    }

    [Fact]
    public async Task UpdateAsync_EditingAPublishedItemWithoutVisibilityChange_QueuesNoNotification()
    {
        var existing = new Content
        {
            Id = 7,
            CategoryId = 1,
            Title = "Gepubliseer",
            PublishedAt = Now.AddDays(-5)
        };
        contentRepository.GetByIdAsync(7, Arg.Any<CancellationToken>()).Returns(existing);

        var request = BuildUpdateRequest();
        request.Title = "Hersiene titel";
        request.PublishedAt = Now.AddDays(-5);

        await contentService.UpdateAsync(7, request, CancellationToken.None);

        notificationService.DidNotReceive().Queue(Arg.Any<string>(), Arg.Any<long?>());
    }

    [Fact]
    public async Task UpdateAsync_WithMissingContent_Fails()
    {
        contentRepository.GetByIdAsync(404, Arg.Any<CancellationToken>()).Returns((Content?)null);

        var result = await contentService.UpdateAsync(404, BuildUpdateRequest(), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Kind.Should().Be(ErrorKind.NotFound);
    }

    [Fact]
    public async Task DeleteAsync_SoftDeletesAndRetractsVisibleContent()
    {
        var existing = new Content
        {
            Id = 7,
            CategoryId = 1,
            Title = "Gepubliseer",
            PublishedAt = Now.AddDays(-5)
        };
        contentRepository.GetByIdAsync(7, Arg.Any<CancellationToken>()).Returns(existing);

        var result = await contentService.DeleteAsync(7, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        existing.IsDeleted.Should().BeTrue();
        notificationService.Received(1).Queue(NotificationTypes.ContentUnpublished, 7);
    }

    private static CreateContentRequest BuildCreateRequest() => new()
    {
        CategoryId = 1,
        Title = "Nuwe inhoud",
        AssetType = AssetType.YouTube,
        AssetReference = "dQw4w9WgXcQ"
    };

    private static UpdateContentRequest BuildUpdateRequest() => new()
    {
        CategoryId = 1,
        Title = "Opgedateerde inhoud",
        AssetType = AssetType.YouTube,
        AssetReference = "dQw4w9WgXcQ"
    };
}
