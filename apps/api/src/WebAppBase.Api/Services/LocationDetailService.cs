using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Api.Repositories;

namespace WebAppBase.Api.Services;

/// <summary>
/// Manages geographic detail attached to content items.
/// </summary>
public sealed class LocationDetailService(
    ILocationDetailRepository locationDetailRepository,
    IContentRepository contentRepository,
    IAuditService auditService,
    IUnitOfWork unitOfWork,
    IClock clock)
{
    public async Task<IReadOnlyList<LocationDetailResponse>> GetForContentAsync(
        long contentId,
        CancellationToken cancellationToken)
    {
        var locations = await locationDetailRepository.GetForContentAsync(contentId, cancellationToken);

        return [.. locations.Select(MapResponse)];
    }

    public async Task<Result<LocationDetailResponse>> CreateAsync(
        CreateLocationDetailRequest request,
        CancellationToken cancellationToken)
    {
        var content = await contentRepository.GetByIdAsync(request.ContentId, cancellationToken);
        if (content is null)
        {
            return Result<LocationDetailResponse>.Failure(Error.Validation(
                ErrorCodes.ContentNotFound,
                "Die inhoud waaraan hierdie ligging gekoppel word, kon nie gevind word nie."));
        }

        var location = new LocationDetail
        {
            ContentId = request.ContentId,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Label = request.Label,
            AddressLine = request.AddressLine,
            Notes = request.Notes,
            TourStopId = request.TourStopId,
            ArAnchorId = request.ArAnchorId,
            NfcTagId = request.NfcTagId,
            CreatedAt = clock.UtcNow
        };

        locationDetailRepository.Add(location);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        auditService.Record(
            EntityTypeNames.LocationDetail,
            location.Id,
            AuditAction.Created,
            null,
            MapResponse(location));

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<LocationDetailResponse>.Success(MapResponse(location));
    }

    public async Task<Result<LocationDetailResponse>> UpdateAsync(
        long id,
        UpdateLocationDetailRequest request,
        CancellationToken cancellationToken)
    {
        var location = await locationDetailRepository.GetByIdAsync(id, cancellationToken);
        if (location is null)
        {
            return Result<LocationDetailResponse>.Failure(LocationNotFound());
        }

        var previousState = MapResponse(location);

        location.Latitude = request.Latitude;
        location.Longitude = request.Longitude;
        location.Label = request.Label;
        location.AddressLine = request.AddressLine;
        location.Notes = request.Notes;
        location.TourStopId = request.TourStopId;
        location.ArAnchorId = request.ArAnchorId;
        location.NfcTagId = request.NfcTagId;
        location.UpdatedAt = clock.UtcNow;

        auditService.Record(
            EntityTypeNames.LocationDetail,
            location.Id,
            AuditAction.Updated,
            previousState,
            MapResponse(location));

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<LocationDetailResponse>.Success(MapResponse(location));
    }

    public async Task<Result> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var location = await locationDetailRepository.GetByIdAsync(id, cancellationToken);
        if (location is null)
        {
            return Result.Failure(LocationNotFound());
        }

        var previousState = MapResponse(location);

        location.IsDeleted = true;
        location.UpdatedAt = clock.UtcNow;

        auditService.Record(EntityTypeNames.LocationDetail, location.Id, AuditAction.Deleted, previousState, null);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    private static Error LocationNotFound() => Error.NotFound(
        ErrorCodes.LocationNotFound,
        "Die ligging kon nie gevind word nie.");

    private static LocationDetailResponse MapResponse(LocationDetail location) => new(
        location.Id,
        location.ContentId,
        location.Latitude,
        location.Longitude,
        location.Label,
        location.AddressLine,
        location.Notes,
        location.TourStopId,
        location.ArAnchorId,
        location.NfcTagId);
}
