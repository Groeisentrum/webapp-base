using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Domain.ValueObjects;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Api.Repositories;

namespace WebAppBase.Api.Services;

/// <summary>
/// Manages content items and their publication state.
/// </summary>
/// <remarks>
/// The publish window and the event window are validated independently and never
/// against each other — an event may legitimately be advertised months ahead and
/// remain visible long after it has passed.
/// </remarks>
public sealed class ContentService(
    IContentRepository contentRepository,
    ICategoryRepository categoryRepository,
    IAuditService auditService,
    INotificationService notificationService,
    IUnitOfWork unitOfWork,
    IClock clock)
{
    public async Task<PagedResponse<ContentResponse>> SearchAsync(
        ContentQuery query,
        CancellationToken cancellationToken)
    {
        var page = await contentRepository.SearchAsync(query, cancellationToken);

        return MapPagedResponse(page, MapResponse);
    }

    public async Task<Result<ContentResponse>> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        var content = await contentRepository.GetByIdAsync(id, cancellationToken);

        return content is null
            ? Result<ContentResponse>.Failure(ContentNotFound())
            : Result<ContentResponse>.Success(MapResponse(content));
    }

    public async Task<Result<ContentResponse>> CreateAsync(
        CreateContentRequest request,
        CancellationToken cancellationToken)
    {
        var recurrence = MapRecurrence(request.Recurrence);

        var validationError = ValidateWindows(
            request.PublishedAt,
            request.UnpublishedAt,
            request.EventStart,
            request.EventEnd,
            recurrence);

        if (validationError is not null)
        {
            return Result<ContentResponse>.Failure(validationError);
        }

        var category = await categoryRepository.GetByIdAsync(request.CategoryId, cancellationToken);
        if (category is null)
        {
            return Result<ContentResponse>.Failure(CategoryNotFound());
        }

        var content = new Content
        {
            CategoryId = request.CategoryId,
            Title = request.Title,
            Description = request.Description,
            Body = request.Body,
            AssetType = request.AssetType,
            AssetReference = request.AssetReference,
            PublishedAt = request.PublishedAt,
            UnpublishedAt = request.UnpublishedAt,
            EventStart = request.EventStart,
            EventEnd = request.EventEnd,
            Recurrence = recurrence,
            Visibility = request.Visibility,
            VisibleToRoles = [.. request.VisibleToRoles],
            CreatedAt = clock.UtcNow
        };

        contentRepository.Add(content);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        auditService.Record(EntityTypeNames.Content, content.Id, AuditAction.Created, null, MapResponse(content));

        if (content.IsVisibleAt(clock.UtcNow))
        {
            notificationService.Queue(NotificationTypes.ContentPublished, content.Id);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<ContentResponse>.Success(MapResponse(content));
    }

    public async Task<Result<ContentResponse>> UpdateAsync(
        long id,
        UpdateContentRequest request,
        CancellationToken cancellationToken)
    {
        var recurrence = MapRecurrence(request.Recurrence);

        var validationError = ValidateWindows(
            request.PublishedAt,
            request.UnpublishedAt,
            request.EventStart,
            request.EventEnd,
            recurrence);

        if (validationError is not null)
        {
            return Result<ContentResponse>.Failure(validationError);
        }

        var content = await contentRepository.GetByIdAsync(id, cancellationToken);
        if (content is null)
        {
            return Result<ContentResponse>.Failure(ContentNotFound());
        }

        if (content.CategoryId != request.CategoryId)
        {
            var category = await categoryRepository.GetByIdAsync(request.CategoryId, cancellationToken);
            if (category is null)
            {
                return Result<ContentResponse>.Failure(CategoryNotFound());
            }
        }

        var now = clock.UtcNow;
        var wasVisible = content.IsVisibleAt(now);
        var previousState = MapResponse(content);

        content.CategoryId = request.CategoryId;
        content.Title = request.Title;
        content.Description = request.Description;
        content.Body = request.Body;
        content.AssetType = request.AssetType;
        content.AssetReference = request.AssetReference;
        content.PublishedAt = request.PublishedAt;
        content.UnpublishedAt = request.UnpublishedAt;
        content.EventStart = request.EventStart;
        content.EventEnd = request.EventEnd;
        content.Recurrence = recurrence;
        content.Visibility = request.Visibility;
        content.VisibleToRoles = [.. request.VisibleToRoles];
        content.UpdatedAt = now;

        auditService.Record(
            EntityTypeNames.Content,
            content.Id,
            AuditAction.Updated,
            previousState,
            MapResponse(content));

        QueueVisibilityNotification(content, wasVisible, now);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<ContentResponse>.Success(MapResponse(content));
    }

    public async Task<Result> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var content = await contentRepository.GetByIdAsync(id, cancellationToken);
        if (content is null)
        {
            return Result.Failure(ContentNotFound());
        }

        var now = clock.UtcNow;
        var wasVisible = content.IsVisibleAt(now);
        var previousState = MapResponse(content);

        content.IsDeleted = true;
        content.UpdatedAt = now;

        auditService.Record(EntityTypeNames.Content, content.Id, AuditAction.Deleted, previousState, null);

        if (wasVisible)
        {
            notificationService.Queue(NotificationTypes.ContentUnpublished, content.Id);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    private void QueueVisibilityNotification(Content content, bool wasVisible, DateTimeOffset now)
    {
        var isVisible = content.IsVisibleAt(now);

        if (isVisible == wasVisible)
        {
            return;
        }

        notificationService.Queue(
            isVisible ? NotificationTypes.ContentPublished : NotificationTypes.ContentUnpublished,
            content.Id);
    }

    private static Error ContentNotFound() => Error.NotFound(
        ErrorCodes.ContentNotFound,
        "Die inhoud kon nie gevind word nie.");

    private static Error CategoryNotFound() => Error.Validation(
        ErrorCodes.CategoryNotFound,
        "Die gekose kategorie kon nie gevind word nie.");

    private static Error? ValidateWindows(
        DateTimeOffset? publishedAt,
        DateTimeOffset? unpublishedAt,
        DateTimeOffset? eventStart,
        DateTimeOffset? eventEnd,
        Recurrence recurrence)
    {
        if (publishedAt is not null && unpublishedAt is not null && unpublishedAt <= publishedAt)
        {
            return Error.Validation(
                ErrorCodes.InvalidPublishWindow,
                "Die datum waarop publikasie eindig moet ná die publikasiedatum wees.");
        }

        if (unpublishedAt is not null && publishedAt is null)
        {
            return Error.Validation(
                ErrorCodes.InvalidPublishWindow,
                "Stel 'n publikasiedatum voordat jy 'n einddatum stel.");
        }

        if (eventStart is not null && eventEnd is not null && eventEnd <= eventStart)
        {
            return Error.Validation(
                ErrorCodes.InvalidEventWindow,
                "Die geleentheid se eindtyd moet ná die begintyd wees.");
        }

        if (eventEnd is not null && eventStart is null)
        {
            return Error.Validation(
                ErrorCodes.InvalidEventWindow,
                "Stel 'n begintyd voordat jy 'n eindtyd stel.");
        }

        if (!recurrence.IsValid())
        {
            return Error.Validation(
                ErrorCodes.InvalidRecurrence,
                "Die herhalingspatroon is onvolledig.");
        }

        if (recurrence.Frequency != RecurrenceFrequency.None && eventStart is null)
        {
            return Error.Validation(
                ErrorCodes.InvalidRecurrence,
                "'n Herhalende geleentheid moet 'n begintyd hê.");
        }

        return null;
    }

    private static Recurrence MapRecurrence(RecurrenceRequest? request) => request is null
        ? Recurrence.None()
        : new Recurrence
        {
            Frequency = request.Frequency,
            DayOfWeek = request.DayOfWeek,
            WeekOfMonth = request.WeekOfMonth
        };

    private static PagedResponse<TResponse> MapPagedResponse<TEntity, TResponse>(
        PagedResult<TEntity> page,
        Func<TEntity, TResponse> map)
    {
        var totalPages = page.PageSize <= 0
            ? 0
            : (int)Math.Ceiling(page.TotalCount / (double)page.PageSize);

        return new PagedResponse<TResponse>(
            [.. page.Items.Select(map)],
            page.TotalCount,
            page.Page,
            page.PageSize,
            totalPages);
    }

    private static ContentResponse MapResponse(Content content) => new(
        content.Id,
        content.CategoryId,
        content.Title,
        content.Description,
        content.Body,
        content.AssetType,
        content.AssetReference,
        content.PublishedAt,
        content.UnpublishedAt,
        content.EventStart,
        content.EventEnd,
        MapRecurrenceResponse(content.Recurrence),
        content.Visibility,
        content.VisibleToRoles,
        content.CreatedAt,
        content.UpdatedAt);

    private static RecurrenceResponse MapRecurrenceResponse(Recurrence recurrence) => new(
        recurrence.Frequency,
        recurrence.DayOfWeek,
        recurrence.WeekOfMonth);
}
