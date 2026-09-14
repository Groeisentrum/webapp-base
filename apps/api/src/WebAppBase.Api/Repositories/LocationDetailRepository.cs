using Microsoft.EntityFrameworkCore;
using WebAppBase.Api.Data;
using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Repositories;

/// <inheritdoc />
public sealed class LocationDetailRepository(WebAppDbContext dbContext) : ILocationDetailRepository
{
    public Task<LocationDetail?> GetByIdAsync(long id, CancellationToken cancellationToken) =>
        dbContext.LocationDetails.FirstOrDefaultAsync(location => location.Id == id, cancellationToken);

    public async Task<IReadOnlyList<LocationDetail>> GetForContentAsync(
        long contentId,
        CancellationToken cancellationToken) =>
        await dbContext.LocationDetails
            .AsNoTracking()
            .Where(location => location.ContentId == contentId)
            .OrderBy(location => location.Id)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<LocationDetail>> GetPublishedWithContentAsync(
        DateTimeOffset instant,
        long? categoryId,
        CancellationToken cancellationToken)
    {
        // The publish window is filtered here and the viewer's visibility above, in the
        // service — the two are separate concerns and an unpublished pin must be gone
        // for everyone regardless of who is asking.
        var query = dbContext.LocationDetails
            .AsNoTracking()
            .Include(location => location.Content!)
            .ThenInclude(content => content.Category!)
            .Where(location => location.Content!.PublishedAt != null
                && location.Content.PublishedAt <= instant
                && (location.Content.UnpublishedAt == null || location.Content.UnpublishedAt > instant));

        if (categoryId is not null)
        {
            query = query.Where(location => location.Content!.CategoryId == categoryId.Value);
        }

        return await query
            .OrderBy(location => location.Content!.Title)
            .ThenBy(location => location.Id)
            .ToListAsync(cancellationToken);
    }

    public void Add(LocationDetail location) => dbContext.LocationDetails.Add(location);
}
