using WebAppBase.Api.Domain;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Domain.ValueObjects;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Api.Repositories;

namespace WebAppBase.Api.Services;

/// <summary>
/// Serves published content to site visitors with text resolved into a requested
/// language and visibility enforced for whoever is asking.
/// </summary>
/// <remarks>
/// Visibility is applied here rather than only in navigation. Hiding a menu entry
/// leaves its URL reachable, and on this template URLs travel — NFC tags and QR codes
/// distribute them. Anything hidden must therefore be filtered server-side.
///
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
    IViewerContext viewerContext,
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

        var viewer = viewerContext.Current;
        var categories = await categoryRepository.GetAllAsync(cancellationToken);
        var visibleCategoryIds = ResolveVisibleCategoryIds(categories, viewer);

        // A requested category the viewer may not see yields nothing rather than an
        // error, so the response cannot confirm that a hidden section exists.
        if (categoryId is not null && !visibleCategoryIds.Contains(categoryId.Value))
        {
            return Result<PagedResponse<PublicContentResponse>>.Success(
                new PagedResponse<PublicContentResponse>([], 0, page, pageSize, 0));
        }

        var query = new ContentQuery(
            categoryId,
            clock.UtcNow,
            searchTerm,
            page,
            pageSize,
            visibleCategoryIds,
            viewer.IsAuthenticated);

        var contentPage = await contentRepository.SearchAsync(query, cancellationToken);

        // Role-gated items survive the SQL filter for any signed-in viewer, so the
        // role check happens here. This can leave a page shorter than its size and the
        // total slightly over-reported. That is acceptable while role-gated content is
        // a small subset; a deployment that gates most of its content should replace
        // VisibleToRoles with a join table so the filter can run in SQL.
        var visibleItems = contentPage.Items
            .Where(content => VisibilityRules.AllowsDirectly(
                content.Visibility,
                content.VisibleToRoles,
                viewer))
            .ToList();

        var contentIds = visibleItems.Select(content => content.Id).ToList();
        var translations = await translationRepository.GetForEntitiesAsync(
            EntityTypeNames.Content,
            contentIds,
            languageResult.Value,
            cancellationToken);

        var translationLookup = BuildTranslationLookup(translations);

        var items = visibleItems
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

        if (content is null || !content.IsVisibleAt(clock.UtcNow))
        {
            return NotFound<PublicContentResponse>();
        }

        var viewer = viewerContext.Current;
        var categories = await categoryRepository.GetAllAsync(cancellationToken);

        // The item's own setting and every category above it must all allow the
        // viewer. Reported as missing rather than forbidden, so a direct URL cannot
        // confirm that restricted content exists.
        if (!IsContentVisible(content, categories, viewer))
        {
            return NotFound<PublicContentResponse>();
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

        var viewer = viewerContext.Current;
        var allCategories = await categoryRepository.GetAllAsync(cancellationToken);
        var visibleCategoryIds = ResolveVisibleCategoryIds(allCategories, viewer);

        var categories = allCategories
            .Where(category => visibleCategoryIds.Contains(category.Id))
            .ToList();

        var translations = await translationRepository.GetForEntitiesAsync(
            EntityTypeNames.Category,
            [.. categories.Select(category => category.Id)],
            languageResult.Value,
            cancellationToken);

        var translationLookup = BuildTranslationLookup(translations);

        return Result<IReadOnlyList<CategoryTreeNodeResponse>>.Success(
            BuildTranslatedTree(categories, translationLookup));
    }

    public async Task<Result<IReadOnlyList<MenuItemResponse>>> GetMenuItemsAsync(
        MenuType? menuType,
        string? languageCode,
        CancellationToken cancellationToken)
    {
        var languageResult = await ResolveLanguageAsync(languageCode, cancellationToken);
        if (languageResult.IsFailure)
        {
            return Result<IReadOnlyList<MenuItemResponse>>.Failure(languageResult.Error!);
        }

        var viewer = viewerContext.Current;
        var allCategories = await categoryRepository.GetAllAsync(cancellationToken);
        var visibleCategoryIds = ResolveVisibleCategoryIds(allCategories, viewer);

        var allMenuItems = await menuItemRepository.GetAsync(menuType, cancellationToken);

        var menuItems = allMenuItems
            .Where(menuItem => IsMenuItemVisible(menuItem, visibleCategoryIds, viewer))
            .ToList();

        var translations = await translationRepository.GetForEntitiesAsync(
            EntityTypeNames.MenuItem,
            [.. menuItems.Select(menuItem => menuItem.Id)],
            languageResult.Value,
            cancellationToken);

        var translationLookup = BuildTranslationLookup(translations);

        var items = menuItems
            .Select(menuItem => MapTranslatedMenuItem(menuItem, translationLookup))
            .ToList();

        return Result<IReadOnlyList<MenuItemResponse>>.Success(items);
    }

    /// <summary>
    /// Every published point of interest the viewer may see, flattened for map and
    /// itinerary consumers.
    /// </summary>
    /// <remarks>
    /// Shares the visibility and translation rules used by the rest of this service
    /// rather than reimplementing them, so a restricted category hides its pins from
    /// the map exactly as it hides its pages — pins carry coordinates, and a hidden
    /// location leaking onto a map is a physical disclosure, not just an editorial one.
    /// </remarks>
    public async Task<Result<IReadOnlyList<PublicLocationResponse>>> GetLocationsAsync(
        long? categoryId,
        string? languageCode,
        CancellationToken cancellationToken)
    {
        var languageResult = await ResolveLanguageAsync(languageCode, cancellationToken);
        if (languageResult.IsFailure)
        {
            return Result<IReadOnlyList<PublicLocationResponse>>.Failure(languageResult.Error!);
        }

        var viewer = viewerContext.Current;
        var categories = await categoryRepository.GetAllAsync(cancellationToken);
        var visibleCategoryIds = ResolveVisibleCategoryIds(categories, viewer);

        // A requested category the viewer may not see yields nothing rather than an
        // error, so the response cannot confirm that a hidden section exists.
        if (categoryId is not null && !visibleCategoryIds.Contains(categoryId.Value))
        {
            return Result<IReadOnlyList<PublicLocationResponse>>.Success([]);
        }

        var locations = await locationDetailRepository.GetPublishedWithContentAsync(
            clock.UtcNow,
            categoryId,
            cancellationToken);

        var visibleLocations = locations
            .Where(location => location.Content is not null
                && location.Content.Category is not null
                && visibleCategoryIds.Contains(location.Content.CategoryId)
                && VisibilityRules.AllowsDirectly(
                    location.Content.Visibility,
                    location.Content.VisibleToRoles,
                    viewer))
            .ToList();

        var contentTranslations = await translationRepository.GetForEntitiesAsync(
            EntityTypeNames.Content,
            [.. visibleLocations.Select(location => location.ContentId).Distinct()],
            languageResult.Value,
            cancellationToken);

        var categoryTranslations = await translationRepository.GetForEntitiesAsync(
            EntityTypeNames.Category,
            [.. visibleLocations.Select(location => location.Content!.CategoryId).Distinct()],
            languageResult.Value,
            cancellationToken);

        var contentLookup = BuildTranslationLookup(contentTranslations);
        var categoryLookup = BuildTranslationLookup(categoryTranslations);

        return Result<IReadOnlyList<PublicLocationResponse>>.Success(
            [.. visibleLocations.Select(location => MapPublicLocation(location, contentLookup, categoryLookup))]);
    }

    private static Result<TValue> NotFound<TValue>() => Result<TValue>.Failure(Error.NotFound(
        ErrorCodes.ContentNotFound,
        "Die inhoud kon nie gevind word nie."));

    /// <summary>
    /// The categories a viewer may see. A category is visible only when it and every
    /// ancestor allows the viewer, so restricting a section hides the whole subtree.
    /// </summary>
    private static HashSet<long> ResolveVisibleCategoryIds(
        IReadOnlyList<Category> categories,
        Viewer viewer)
    {
        var byId = categories.ToDictionary(category => category.Id);

        return
        [
            .. categories
                .Where(category => VisibilityRules.AllowsThroughChain(BuildChain(byId, category.Id), viewer))
                .Select(category => category.Id)
        ];
    }

    private static bool IsContentVisible(Content content, IReadOnlyList<Category> categories, Viewer viewer)
    {
        if (!VisibilityRules.AllowsDirectly(content.Visibility, content.VisibleToRoles, viewer))
        {
            return false;
        }

        var byId = categories.ToDictionary(category => category.Id);

        return VisibilityRules.AllowsThroughChain(BuildChain(byId, content.CategoryId), viewer);
    }

    /// <summary>
    /// A menu entry is hidden when its own setting excludes the viewer, and also when
    /// it points at a category they cannot see — otherwise the site would show a link
    /// to a page that returns nothing.
    /// </summary>
    private static bool IsMenuItemVisible(
        MenuItem menuItem,
        HashSet<long> visibleCategoryIds,
        Viewer viewer)
    {
        if (!VisibilityRules.AllowsDirectly(menuItem.Visibility, menuItem.VisibleToRoles, viewer))
        {
            return false;
        }

        if (menuItem.LinkType == MenuLinkType.Category && menuItem.CategoryId is not null)
        {
            return visibleCategoryIds.Contains(menuItem.CategoryId.Value);
        }

        return true;
    }

    /// <summary>Walks from a category up to the root, guarding against a cyclic parent chain.</summary>
    private static List<(Visibility Visibility, IReadOnlyList<string> VisibleToRoles)> BuildChain(
        Dictionary<long, Category> byId,
        long? categoryId)
    {
        var chain = new List<(Visibility, IReadOnlyList<string>)>();
        var visited = new HashSet<long>();
        var currentId = categoryId;

        while (currentId is not null
            && byId.TryGetValue(currentId.Value, out var category)
            && visited.Add(currentId.Value))
        {
            chain.Add((category.Visibility, category.VisibleToRoles));
            currentId = category.ParentCategoryId;
        }

        return chain;
    }

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
        menuItem.Visibility,
        menuItem.VisibleToRoles,
        menuItem.CreatedAt,
        menuItem.UpdatedAt);

    private static IReadOnlyList<CategoryTreeNodeResponse> BuildTranslatedTree(
        IReadOnlyList<Category> categories,
        Dictionary<(long EntityId, string FieldName), string> translationLookup)
    {
        var childrenByParent = categories
            .GroupBy(category => category.ParentCategoryId)
            .ToDictionary(group => group.Key ?? 0L, group => group.ToList());

        // Pruning can orphan a child whose parent was hidden. Those are unreachable
        // by definition, so only the roots reachable from level zero are returned.
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
        location.Notes,
        location.TourStopId,
        location.ArAnchorId,
        location.NfcTagId);

    /// <summary>
    /// Flattens a pin and its owning content and category into the public contract.
    /// A pin's own label wins over the content title when set, since a map needs a
    /// shorter name than a page heading.
    /// </summary>
    private static PublicLocationResponse MapPublicLocation(
        LocationDetail location,
        Dictionary<(long EntityId, string FieldName), string> contentLookup,
        Dictionary<(long EntityId, string FieldName), string> categoryLookup)
    {
        var content = location.Content!;
        var category = content.Category!;

        var translatedTitle = Translated(
            contentLookup,
            content.Id,
            TranslatableFieldNames.Title,
            content.Title);

        return new PublicLocationResponse(
            location.Id,
            content.Id,
            string.IsNullOrWhiteSpace(location.Label) ? translatedTitle : location.Label,
            TranslatedOrNull(contentLookup, content.Id, TranslatableFieldNames.Description, content.Description),
            category.Id,
            Translated(categoryLookup, category.Id, TranslatableFieldNames.Name, category.Name),
            category.Slug,
            category.Colour,
            content.AssetReference,
            location.Latitude,
            location.Longitude,
            location.AddressLine,
            location.TourStopId,
            location.ArAnchorId,
            location.NfcTagId);
    }
}
