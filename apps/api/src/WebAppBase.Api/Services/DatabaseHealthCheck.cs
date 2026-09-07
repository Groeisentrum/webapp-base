using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using WebAppBase.Api.Data;

namespace WebAppBase.Api.Services;

/// <summary>
/// Reports the API as healthy only when its database is reachable, so a load
/// balancer takes an instance with a broken connection out of rotation.
/// </summary>
public sealed class DatabaseHealthCheck(WebAppDbContext dbContext) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var canConnect = await dbContext.Database.CanConnectAsync(cancellationToken);

            return canConnect
                ? HealthCheckResult.Healthy()
                : HealthCheckResult.Unhealthy("Database is not reachable.");
        }
        catch (Exception exception)
        {
            return HealthCheckResult.Unhealthy("Database health check failed.", exception);
        }
    }
}
