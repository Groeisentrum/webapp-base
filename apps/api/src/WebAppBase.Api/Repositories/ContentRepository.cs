using Microsoft.EntityFrameworkCore;
using WebAppBase.Api.Data;
using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Repositories;

/// <inheritdoc />
public sealed class ContentRepository(WebAppDbContext dbContext) : IContentRepository
{
    public Task<Content?> GetByIdAsync(long id, CancellationToken cancellationToken) =>
        dbContext.ContentItems.FirstOrDefaultAsync(content => content.Id == id, cancellationToken);

    public Task<Content?> GetWithLocationsAsync(long id, CancellationToken cancellationToken) =>
        dbContext.ContentItems
            .Include(content => content.LocationDetails)
            .FirstOrDefaultAsync(content => content.Id == id, cancellationToken);

    public async Task<PagedResult<Content>> SearchAsync(ContentQuery query, CancellationToken cancellationToken)
    {
        var filtered = ApplyFilters(dbContext.ContentItems.AsNoTracking(), query);

        var totalCount = await filtered.CountAsync(cancellationToken);

        var items = await filtered
            .OrderByDescending(content => content.PublishedAt ?? content.CreatedAt)
            .ThenByDescending(content => content.Id)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<Content>(items, totalCount, query.Page, query.PageSize);
    }

    public void Add(Content content) => dbContext.ContentItems.Add(content);

    private static IQueryable<Content> ApplyFilters(IQueryable<Content> source, ContentQuery query)
    {
        if (query.CategoryId is not null)
        {
            source = source.Where(content => content.CategoryId == query.CategoryId);
        }

        if (query.VisibleAt is not null)
        {
            var instant = query.VisibleAt.Value;
            source = source.Where(content =>
                content.PublishedAt != null
                && content.PublishedAt <= instant
                && (content.UnpublishedAt == null || content.UnpublishedAt > instant));
        }

        if (!string.IsNullOrWhiteSpace(query.SearchTerm))
        {
            var searchTerm = query.SearchTerm.Trim();
            source = source.Where(content => content.Title.Contains(searchTerm));
        }

        return source;
    }
}
