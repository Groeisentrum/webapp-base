using Microsoft.EntityFrameworkCore;
using WebAppBase.Api.Data;
using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Repositories;

/// <inheritdoc />
public sealed class TranslationRepository(WebAppDbContext dbContext) : ITranslationRepository
{
    public Task<Translation?> GetByIdAsync(long id, CancellationToken cancellationToken) =>
        dbContext.Translations.FirstOrDefaultAsync(translation => translation.Id == id, cancellationToken);

    public Task<Translation?> FindAsync(
        string entityType,
        long entityId,
        string fieldName,
        string languageCode,
        CancellationToken cancellationToken) =>
        dbContext.Translations.FirstOrDefaultAsync(
            translation => translation.EntityType == entityType
                && translation.EntityId == entityId
                && translation.FieldName == fieldName
                && translation.LanguageCode == languageCode,
            cancellationToken);

    public async Task<IReadOnlyList<Translation>> GetForEntityAsync(
        string entityType,
        long entityId,
        CancellationToken cancellationToken) =>
        await dbContext.Translations
            .AsNoTracking()
            .Where(translation => translation.EntityType == entityType && translation.EntityId == entityId)
            .OrderBy(translation => translation.FieldName)
            .ThenBy(translation => translation.LanguageCode)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Translation>> GetForEntitiesAsync(
        string entityType,
        IReadOnlyCollection<long> entityIds,
        string languageCode,
        CancellationToken cancellationToken)
    {
        if (entityIds.Count == 0)
        {
            return [];
        }

        return await dbContext.Translations
            .AsNoTracking()
            .Where(translation => translation.EntityType == entityType
                && entityIds.Contains(translation.EntityId)
                && translation.LanguageCode == languageCode)
            .ToListAsync(cancellationToken);
    }

    public void Add(Translation translation) => dbContext.Translations.Add(translation);
}
