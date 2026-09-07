using Microsoft.EntityFrameworkCore;
using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Data;

/// <summary>
/// The deployment's own database. This API owns its data outright — it is not a
/// lego block behind BlokDirigent and shares no schema with other services.
/// </summary>
public class WebAppDbContext(DbContextOptions<WebAppDbContext> options) : DbContext(options)
{
    public DbSet<TenantSettings> TenantSettings => Set<TenantSettings>();

    public DbSet<Category> Categories => Set<Category>();

    public DbSet<Content> ContentItems => Set<Content>();

    public DbSet<Translation> Translations => Set<Translation>();

    public DbSet<MenuItem> MenuItems => Set<MenuItem>();

    public DbSet<LocationDetail> LocationDetails => Set<LocationDetail>();

    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    public DbSet<NotificationLog> NotificationLogs => Set<NotificationLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(WebAppDbContext).Assembly);
    }
}
