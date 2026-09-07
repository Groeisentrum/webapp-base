using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Enums;

namespace WebAppBase.Api.Repositories;

/// <summary>
/// Access to configurable navigation entries.
/// </summary>
public interface IMenuItemRepository
{
    Task<MenuItem?> GetByIdAsync(long id, CancellationToken cancellationToken);

    /// <summary>Menu entries, optionally restricted to one navigation surface.</summary>
    Task<IReadOnlyList<MenuItem>> GetAsync(MenuType? menuType, CancellationToken cancellationToken);

    Task<bool> HasChildMenuItemsAsync(long menuItemId, CancellationToken cancellationToken);

    void Add(MenuItem menuItem);
}
