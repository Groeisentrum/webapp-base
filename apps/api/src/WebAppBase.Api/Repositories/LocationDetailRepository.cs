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

    public void Add(LocationDetail location) => dbContext.LocationDetails.Add(location);
}
