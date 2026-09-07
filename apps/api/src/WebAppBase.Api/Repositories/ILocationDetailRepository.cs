using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Repositories;

/// <summary>
/// Access to geographic detail attached to content.
/// </summary>
public interface ILocationDetailRepository
{
    Task<LocationDetail?> GetByIdAsync(long id, CancellationToken cancellationToken);

    Task<IReadOnlyList<LocationDetail>> GetForContentAsync(long contentId, CancellationToken cancellationToken);

    void Add(LocationDetail location);
}
