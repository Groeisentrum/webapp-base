using Microsoft.EntityFrameworkCore;
using WebAppBase.Api.Data;
using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Repositories;

/// <inheritdoc />
public sealed class TenantSettingsRepository(WebAppDbContext dbContext) : ITenantSettingsRepository
{
    public Task<TenantSettings?> GetAsync(CancellationToken cancellationToken) =>
        dbContext.TenantSettings.OrderBy(settings => settings.Id).FirstOrDefaultAsync(cancellationToken);

    public void Add(TenantSettings settings) => dbContext.TenantSettings.Add(settings);
}
