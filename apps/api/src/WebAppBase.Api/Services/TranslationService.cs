using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Api.Repositories;

namespace WebAppBase.Api.Services;

/// <summary>
/// Manages per-field translations for any translatable entity.
/// </summary>
public sealed class TranslationService(
    ITranslationRepository translationRepository,
    ITenantSettingsRepository tenantSettingsRepository,
    IUnitOfWork unitOfWork,
    IClock clock)
{
    public async Task<IReadOnlyList<TranslationResponse>> GetForEntityAsync(
        string entityType,
        long entityId,
        CancellationToken cancellationToken)
    {
        var translations = await translationRepository.GetForEntityAsync(entityType, entityId, cancellationToken);

        return [.. translations.Select(MapResponse)];
    }

    /// <summary>
    /// Creates the translation, or replaces the value if one already exists for that
    /// entity, field and language.
    /// </summary>
    public async Task<Result<TranslationResponse>> UpsertAsync(
        UpsertTranslationRequest request,
        CancellationToken cancellationToken)
    {
        var settings = await tenantSettingsRepository.GetAsync(cancellationToken);
        if (settings is null)
        {
            return Result<TranslationResponse>.Failure(Error.NotFound(
                ErrorCodes.TenantSettingsNotInitialised,
                "Die werf se instellings is nog nie opgestel nie."));
        }

        // Reject languages the deployment does not publish in, otherwise translations
        // accumulate that nothing will ever render.
        if (!settings.SupportsLanguage(request.LanguageCode))
        {
            return Result<TranslationResponse>.Failure(Error.Validation(
                ErrorCodes.UnsupportedLanguage,
                "Hierdie taal is nie vir die werf geaktiveer nie."));
        }

        var existing = await translationRepository.FindAsync(
            request.EntityType,
            request.EntityId,
            request.FieldName,
            request.LanguageCode,
            cancellationToken);

        var translation = existing ?? new Translation
        {
            EntityType = request.EntityType,
            EntityId = request.EntityId,
            FieldName = request.FieldName,
            LanguageCode = request.LanguageCode,
            CreatedAt = clock.UtcNow
        };

        translation.Value = request.Value;

        if (existing is null)
        {
            translationRepository.Add(translation);
        }
        else
        {
            translation.UpdatedAt = clock.UtcNow;
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<TranslationResponse>.Success(MapResponse(translation));
    }

    public async Task<Result> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var translation = await translationRepository.GetByIdAsync(id, cancellationToken);
        if (translation is null)
        {
            return Result.Failure(Error.NotFound(
                ErrorCodes.TranslationNotFound,
                "Die vertaling kon nie gevind word nie."));
        }

        translation.IsDeleted = true;
        translation.UpdatedAt = clock.UtcNow;

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    private static TranslationResponse MapResponse(Translation translation) => new(
        translation.Id,
        translation.EntityType,
        translation.EntityId,
        translation.FieldName,
        translation.LanguageCode,
        translation.Value,
        translation.CreatedAt,
        translation.UpdatedAt);
}
