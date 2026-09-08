namespace WebAppBase.Api.Repositories;

/// <summary>
/// Filters for a content listing.
/// </summary>
/// <param name="CategoryId">Restricts to one category when set.</param>
/// <param name="VisibleAt">
/// When set, returns only items whose publish window contains this instant. The
/// public endpoints always set it; admin listings leave it null to see drafts and
/// expired items.
/// </param>
/// <param name="SearchTerm">Case-insensitive match against the title.</param>
/// <param name="AllowedCategoryIds">
/// When set, restricts results to these categories. The public endpoints pass the
/// categories the viewer may see, so a hidden section's content cannot surface in a
/// listing. Null means no restriction, which is what admin listings use.
/// </param>
/// <param name="ViewerIsAuthenticated">
/// Lets the query exclude sign-in-only content for anonymous callers.
/// </param>
public sealed record ContentQuery(
    long? CategoryId,
    DateTimeOffset? VisibleAt,
    string? SearchTerm,
    int Page,
    int PageSize,
    IReadOnlyCollection<long>? AllowedCategoryIds = null,
    bool ViewerIsAuthenticated = true);
