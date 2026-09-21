using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace WebAppBase.Api.Data;

/// <summary>
/// Supplies a context to the EF Core tooling. Used only by <c>dotnet ef</c> at design
/// time — the connection is never opened, so the placeholder string is sufficient and
/// no live database is needed to scaffold a migration.
/// </summary>
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<WebAppDbContext>
{
    private const string DesignTimeConnectionString =
        "server=localhost;port=3306;database=webapp_base;user=root;password=design-time";

    public WebAppDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("DATABASE__CONNECTIONSTRING")
            ?? DesignTimeConnectionString;

        var optionsBuilder = new DbContextOptionsBuilder<WebAppDbContext>();
        optionsBuilder.UseMySql(connectionString, new MariaDbServerVersion(new Version(11, 8, 9)));

        return new WebAppDbContext(optionsBuilder.Options);
    }
}
