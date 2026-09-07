using Microsoft.EntityFrameworkCore;
using WebAppBase.Api.Data;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Enums;

namespace WebAppBase.Api.Repositories;

/// <inheritdoc />
public sealed class MenuItemRepository(WebAppDbContext dbContext) : IMenuItemRepository
{
    public Task<MenuItem?> GetByIdAsync(long id, CancellationToken cancellationToken) =>
        dbContext.MenuItems.FirstOrDefaultAsync(menuItem => menuItem.Id == id, cancellationToken);

    public async Task<IReadOnlyList<MenuItem>> GetAsync(MenuType? menuType, CancellationToken cancellationToken)
    {
        var source = dbContext.MenuItems.AsNoTracking();

        if (menuType is not null)
        {
            source = source.Where(menuItem => menuItem.MenuType == menuType);
        }

        return await source
            .OrderBy(menuItem => menuItem.MenuType)
            .ThenBy(menuItem => menuItem.SortOrder)
            .ThenBy(menuItem => menuItem.Label)
            .ToListAsync(cancellationToken);
    }

    public Task<bool> HasChildMenuItemsAsync(long menuItemId, CancellationToken cancellationToken) =>
        dbContext.MenuItems.AnyAsync(menuItem => menuItem.ParentMenuItemId == menuItemId, cancellationToken);

    public void Add(MenuItem menuItem) => dbContext.MenuItems.Add(menuItem);
}
