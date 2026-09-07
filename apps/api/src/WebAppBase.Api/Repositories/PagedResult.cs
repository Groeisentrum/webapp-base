namespace WebAppBase.Api.Repositories;

/// <summary>
/// One page of results together with the total available, so callers can render paging.
/// </summary>
public sealed record PagedResult<TItem>(IReadOnlyList<TItem> Items, int TotalCount, int Page, int PageSize);
