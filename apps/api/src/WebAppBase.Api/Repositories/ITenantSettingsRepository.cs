using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Repositories;

/// <summary>
/// Access to the deployment's single settings row.
/// </summary>
public interface ITenantSettingsRepository
{
    /// <summary>Returns the settings row, or null when the deployment has not been seeded.</summary>
    Task<TenantSettings?> GetAsync(CancellationToken cancellationToken);

    void Add(TenantSettings settings);
}
