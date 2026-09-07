using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Repositories;

/// <summary>
/// Access to content items.
/// </summary>
public interface IContentRepository
{
    Task<Content?> GetByIdAsync(long id, CancellationToken cancellationToken);

    /// <summary>Loads a content item together with its location rows.</summary>
    Task<Content?> GetWithLocationsAsync(long id, CancellationToken cancellationToken);

    Task<PagedResult<Content>> SearchAsync(ContentQuery query, CancellationToken cancellationToken);

    void Add(Content content);
}
