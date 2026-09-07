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
public sealed record ContentQuery(
    long? CategoryId,
    DateTimeOffset? VisibleAt,
    string? SearchTerm,
    int Page,
    int PageSize);
