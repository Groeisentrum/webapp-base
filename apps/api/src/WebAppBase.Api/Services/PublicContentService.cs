using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Domain.ValueObjects;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Api.Repositories;

namespace WebAppBase.Api.Services;

/// <summary>
/// Serves published content to site visitors with text resolved into a requested language.
/// </summary>
/// <remarks>
/// A missing translation falls back to the row's default-language value rather than
/// hiding the item, so an untranslated field degrades to readable text instead of a gap.
/// </remarks>
public sealed class PublicContentService(
    IContentRepository contentRepository,
    ICategoryRepository categoryRepository,
    ITranslationRepository translationRepository,
    IMenuItemRepository menuItemRepository,
    ITenantSettingsRepository tenantSettingsRepository,
    ILocationDetailRepository locationDetailRepository,
    IClock clock)
{
    public async Task<Result<PagedResponse<PublicContentResponse>>> SearchAsync(
        long? categoryId,
        string? languageCode,
        string? searchTerm,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var languageResult = await ResolveLanguageAsync(languageCode, cancellationToken);
        if (languageResult.IsFailure)
        {
            return Result<PagedResponse<PublicContentResponse>>.Failure(languageResult.Error!);
        }

        var query = new ContentQuery(categoryId, clock.UtcNow, searchTerm, page, pageSize);
        var contentPage = await contentRepository.SearchAsync(query, cancellationToken);

        var contentIds = contentPage.Items.Select(content => content.Id).ToList();
        var translations = await translationRepository.GetForEntitiesAsync(
            EntityTypeNames.Content,
            contentIds,
            languageResult.Value,
            cancellationToken);

        var translationLookup = BuildTranslationLookup(translations);

        var items = contentPage.Items
            .Select(content => MapPublicResponse(content, translationLookup, []))
            .ToList();

        var totalPages = contentPage.PageSize <= 0
            ? 0
            : (int)Math.Ceiling(contentPage.TotalCount / (double)contentPage.PageSize);

        return Result<PagedResponse<PublicContentResponse>>.Success(new PagedResponse<PublicContentResponse>(
            items,
            contentPage.TotalCount,
            contentPage.Page,
            contentPage.PageSize,
            totalPages));
    }

    public async Task<Result<PublicContentResponse>> GetByIdAsync(
        long id,
        string? languageCode,
        CancellationToken cancellationToken)
    {
        var languageResult = await ResolveLanguageAsync(languageCode, cancellationToken);
        if (languageResult.IsFailure)
        {
            return Result<PublicContentResponse>.Failure(languageResult.Error!);
        }

        var content = await contentRepository.GetByIdAsync(id, cancellationToken);

        // An unpublished item is reported as missing rather than forbidden, so the
        // public API does not reveal that a draft exists.
        if (content is null || !content.IsVisibleAt(clock.UtcNow))
        {
            return Result<PublicContentResponse>.Failure(Error.NotFound(
                ErrorCodes.ContentNotFound,
                "Die inhoud kon nie gevind word nie."));
        }

        var translations = await translationRepository.GetForEntitiesAsync(
            EntityTypeNames.Content,
            [content.Id],
            languageResult.Value,
            cancellationToken);

        var locations = await locationDetailRepository.GetForContentAsync(content.Id, cancellationToken);

        var translationLookup = BuildTranslationLookup(translations);

        return Result<PublicContentResponse>.Success(
            MapPublicResponse(content, translationLookup, locations));
    }

    public async Task<Result<IReadOnlyList<CategoryTreeNodeResponse>>> GetCategoryTreeAsync(
        string? languageCode,
        CancellationToken cancellationToken)
    {
        var languageResult = await ResolveLanguageAsync(languageCode, cancellationToken);
        if (languageResult.IsFailure)
        {
            return Result<IReadOnlyList<CategoryTreeNodeResponse>>.Failure(languageResult.Error!);
        }

        var categories = await categoryRepository.GetAllAsync(cancellationToken);
        var categoryIds = categories.Select(category => category.Id).ToList();

        var translations = await translationRepository.GetForEntitiesAsync(
            EntityTypeNames.Category,
            categoryIds,
            languageResult.Value,
            cancellationToken);

        var translationLookup = BuildTranslationLookup(translations);

        return Result<IReadOnlyList<CategoryTreeNodeResponse>>.Success(
            BuildTranslatedTree(categories, translationLookup));
    }

    public async Task<Result<IReadOnlyList<MenuItemResponse>>> GetMenuItemsAsync(
        Domain.Enums.MenuType? menuType,
        string? languageCode,
        CancellationToken cancellationToken)
    {
        var languageResult = await ResolveLanguageAsync(languageCode, cancellationToken);
        if (languageResult.IsFailure)
        {
            return Result<IReadOnlyList<MenuItemResponse>>.Failure(languageResult.Error!);
        }

        var menuItems = await menuItemRepository.GetAsync(menuType, cancellationToken);
        var menuItemIds = menuItems.Select(menuItem => menuItem.Id).ToList();

        var translations = await translationRepository.GetForEntitiesAsync(
            EntityTypeNames.MenuItem,
            menuItemIds,
            languageResult.Value,
            cancellationToken);

        var translationLookup = BuildTranslationLookup(translations);

        var items = menuItems
            .Select(menuItem => MapTranslatedMenuItem(menuItem, translationLookup))
            .ToList();

        return Result<IReadOnlyList<MenuItemResponse>>.Success(items);
    }

    /// <summary>
    /// Falls back to the deployment's default language when none is requested, and
    /// rejects a language the deployment does not publish in.
    /// </summary>
    private async Task<Result<string>> ResolveLanguageAsync(
        string? languageCode,
        CancellationToken cancellationToken)
    {
        var settings = await tenantSettingsRepository.GetAsync(cancellationToken);
        if (settings is null)
        {
            return Result<string>.Failure(Error.NotFound(
                ErrorCodes.TenantSettingsNotInitialised,
                "Die werf se instellings is nog nie opgestel nie."));
        }

        if (string.IsNullOrWhiteSpace(languageCode))
        {
            return Result<string>.Success(settings.DefaultLanguageCode);
        }

        return settings.SupportsLanguage(languageCode)
            ? Result<string>.Success(languageCode)
            : Result<string>.Failure(Error.Validation(
                ErrorCodes.UnsupportedLanguage,
                "Hierdie taal is nie vir die werf beskikbaar nie."));
    }

    private static Dictionary<(long EntityId, string FieldName), string> BuildTranslationLookup(
        IReadOnlyList<Translation> translations) =>
        translations.ToDictionary(
            translation => (translation.EntityId, translation.FieldName),
            translation => translation.Value);

    private static string Translated(
        Dictionary<(long EntityId, string FieldName), string> lookup,
        long entityId,
        string fieldName,
        string fallback) =>
        lookup.TryGetValue((entityId, fieldName), out var value) && !string.IsNullOrWhiteSpace(value)
            ? value
            : fallback;

    private static string? TranslatedOrNull(
        Dictionary<(long EntityId, string FieldName), string> lookup,
        long entityId,
        string fieldName,
        string? fallback) =>
        lookup.TryGetValue((entityId, fieldName), out var value) && !string.IsNullOrWhiteSpace(value)
            ? value
            : fallback;

    private static PublicContentResponse MapPublicResponse(
        Content content,
        Dictionary<(long EntityId, string FieldName), string> translationLookup,
        IReadOnlyList<LocationDetail> locations) => new(
        content.Id,
        content.CategoryId,
        Translated(translationLookup, content.Id, TranslatableFieldNames.Title, content.Title),
        TranslatedOrNull(translationLookup, content.Id, TranslatableFieldNames.Description, content.Description),
        TranslatedOrNull(translationLookup, content.Id, TranslatableFieldNames.Body, content.Body),
        content.AssetType,
        content.AssetReference,
        content.EventStart,
        content.EventEnd,
        MapRecurrenceResponse(content.Recurrence),
        [.. locations.Select(MapLocationResponse)]);

    private static MenuItemResponse MapTranslatedMenuItem(
        MenuItem menuItem,
        Dictionary<(long EntityId, string FieldName), string> translationLookup) => new(
        menuItem.Id,
        menuItem.MenuType,
        menuItem.LinkType,
        Translated(translationLookup, menuItem.Id, TranslatableFieldNames.Label, menuItem.Label),
        menuItem.CategoryId,
        menuItem.StaticPageSlug,
        menuItem.ExternalUrl,
        menuItem.ParentMenuItemId,
        menuItem.SortOrder,
        menuItem.CreatedAt,
        menuItem.UpdatedAt);

    private static IReadOnlyList<CategoryTreeNodeResponse> BuildTranslatedTree(
        IReadOnlyList<Category> categories,
        Dictionary<(long EntityId, string FieldName), string> translationLookup)
    {
        var childrenByParent = categories
            .GroupBy(category => category.ParentCategoryId)
            .ToDictionary(group => group.Key ?? 0L, group => group.ToList());

        return BuildTranslatedBranch(childrenByParent, 0L, translationLookup);
    }

    private static IReadOnlyList<CategoryTreeNodeResponse> BuildTranslatedBranch(
        Dictionary<long, List<Category>> childrenByParent,
        long parentId,
        Dictionary<(long EntityId, string FieldName), string> translationLookup)
    {
        if (!childrenByParent.TryGetValue(parentId, out var children))
        {
            return [];
        }

        return
        [
            .. children
                .OrderBy(category => category.SortOrder)
                .ThenBy(category => category.Name)
                .Select(category => new CategoryTreeNodeResponse(
                    category.Id,
                    category.ParentCategoryId,
                    Translated(translationLookup, category.Id, TranslatableFieldNames.Name, category.Name),
                    category.Slug,
                    category.Colour,
                    category.Icon,
                    category.SortOrder,
                    BuildTranslatedBranch(childrenByParent, category.Id, translationLookup)))
        ];
    }

    private static RecurrenceResponse MapRecurrenceResponse(Recurrence recurrence) => new(
        recurrence.Frequency,
        recurrence.DayOfWeek,
        recurrence.WeekOfMonth);

    private static LocationDetailResponse MapLocationResponse(LocationDetail location) => new(
        location.Id,
        location.ContentId,
        location.Latitude,
        location.Longitude,
        location.Label,
        location.AddressLine,
        location.Notes);
}
