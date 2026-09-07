namespace WebAppBase.Api.Models.Responses;

/// <summary>
/// A page of results plus the totals a client needs to render pagination.
/// </summary>
public sealed record PagedResponse<TItem>(
    IReadOnlyList<TItem> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages);
