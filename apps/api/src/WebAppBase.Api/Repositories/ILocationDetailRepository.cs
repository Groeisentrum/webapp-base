using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Repositories;

/// <summary>
/// Access to geographic detail attached to content.
/// </summary>
public interface ILocationDetailRepository
{
    Task<LocationDetail?> GetByIdAsync(long id, CancellationToken cancellationToken);

    Task<IReadOnlyList<LocationDetail>> GetForContentAsync(long contentId, CancellationToken cancellationToken);

    /// <summary>
    /// Every pin whose content is inside the supplied publish window, with the owning
    /// content and category loaded so the public feed can be built without a second
    /// round trip per pin.
    /// </summary>
    Task<IReadOnlyList<LocationDetail>> GetPublishedWithContentAsync(
        DateTimeOffset instant,
        long? categoryId,
        CancellationToken cancellationToken);

    void Add(LocationDetail location);
}
