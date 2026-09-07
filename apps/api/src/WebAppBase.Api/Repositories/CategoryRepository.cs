using Microsoft.EntityFrameworkCore;
using WebAppBase.Api.Data;
using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Repositories;

/// <inheritdoc />
public sealed class CategoryRepository(WebAppDbContext dbContext) : ICategoryRepository
{
    public Task<Category?> GetByIdAsync(long id, CancellationToken cancellationToken) =>
        dbContext.Categories.FirstOrDefaultAsync(category => category.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Category>> GetAllAsync(CancellationToken cancellationToken) =>
        await dbContext.Categories
            .AsNoTracking()
            .OrderBy(category => category.SortOrder)
            .ThenBy(category => category.Name)
            .ToListAsync(cancellationToken);

    public Task<bool> SlugExistsAsync(string slug, long? excludingId, CancellationToken cancellationToken) =>
        dbContext.Categories.AnyAsync(
            category => category.Slug == slug && (excludingId == null || category.Id != excludingId),
            cancellationToken);

    public Task<bool> HasChildCategoriesAsync(long categoryId, CancellationToken cancellationToken) =>
        dbContext.Categories.AnyAsync(category => category.ParentCategoryId == categoryId, cancellationToken);

    public Task<bool> HasContentAsync(long categoryId, CancellationToken cancellationToken) =>
        dbContext.ContentItems.AnyAsync(content => content.CategoryId == categoryId, cancellationToken);

    public void Add(Category category) => dbContext.Categories.Add(category);
}
