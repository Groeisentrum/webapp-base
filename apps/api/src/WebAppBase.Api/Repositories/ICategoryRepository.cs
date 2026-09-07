using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Repositories;

/// <summary>
/// Access to the category hierarchy.
/// </summary>
public interface ICategoryRepository
{
    Task<Category?> GetByIdAsync(long id, CancellationToken cancellationToken);

    /// <summary>Every live category, ordered for tree assembly.</summary>
    Task<IReadOnlyList<Category>> GetAllAsync(CancellationToken cancellationToken);

    Task<bool> SlugExistsAsync(string slug, long? excludingId, CancellationToken cancellationToken);

    Task<bool> HasChildCategoriesAsync(long categoryId, CancellationToken cancellationToken);

    Task<bool> HasContentAsync(long categoryId, CancellationToken cancellationToken);

    void Add(Category category);
}
