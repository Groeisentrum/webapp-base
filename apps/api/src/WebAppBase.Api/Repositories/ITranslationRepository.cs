using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Repositories;

/// <summary>
/// Access to per-field translations.
/// </summary>
public interface ITranslationRepository
{
    Task<Translation?> GetByIdAsync(long id, CancellationToken cancellationToken);

    /// <summary>Finds the single translation for one field of one entity in one language.</summary>
    Task<Translation?> FindAsync(
        string entityType,
        long entityId,
        string fieldName,
        string languageCode,
        CancellationToken cancellationToken);

    /// <summary>Every translation for one entity, across fields and languages.</summary>
    Task<IReadOnlyList<Translation>> GetForEntityAsync(
        string entityType,
        long entityId,
        CancellationToken cancellationToken);

    /// <summary>
    /// Translations for many entities of one type in one language. Used by list
    /// endpoints so rendering a page of content costs one query rather than one per row.
    /// </summary>
    Task<IReadOnlyList<Translation>> GetForEntitiesAsync(
        string entityType,
        IReadOnlyCollection<long> entityIds,
        string languageCode,
        CancellationToken cancellationToken);

    void Add(Translation translation);
}
