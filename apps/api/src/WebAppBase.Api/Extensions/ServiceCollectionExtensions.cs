using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebAppBase.Api.Configuration;
using WebAppBase.Api.Data;
using WebAppBase.Api.Repositories;
using WebAppBase.Api.Services;

namespace WebAppBase.Api.Extensions;

/// <summary>
/// Registration helpers keeping <c>Program.cs</c> readable.
/// </summary>
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddWebAppPersistence(
        this IServiceCollection services,
        DatabaseOptions databaseOptions)
    {
        services.AddDbContext<WebAppDbContext>(options =>
            options.UseMySQL(databaseOptions.ConnectionString));

        services.AddScoped<IUnitOfWork, UnitOfWork>();

        return services;
    }

    public static IServiceCollection AddWebAppRepositories(this IServiceCollection services)
    {
        services.AddScoped<ITenantSettingsRepository, TenantSettingsRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IContentRepository, ContentRepository>();
        services.AddScoped<ITranslationRepository, TranslationRepository>();
        services.AddScoped<IMenuItemRepository, MenuItemRepository>();
        services.AddScoped<ILocationDetailRepository, LocationDetailRepository>();
        services.AddScoped<IAuditLogRepository, AuditLogRepository>();

        return services;
    }

    public static IServiceCollection AddWebAppServices(this IServiceCollection services)
    {
        services.AddSingleton<IClock, SystemClock>();
        services.AddHttpContextAccessor();
        services.AddScoped<IActorContext, HttpActorContext>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<INotificationService, NotificationService>();

        services.AddScoped<TenantSettingsService>();
        services.AddScoped<CategoryService>();
        services.AddScoped<ContentService>();
        services.AddScoped<TranslationService>();
        services.AddScoped<MenuItemService>();
        services.AddScoped<LocationDetailService>();
        services.AddScoped<AuditLogService>();
        services.AddScoped<PublicContentService>();

        return services;
    }

    public static IServiceCollection AddPosduifDispatch(this IServiceCollection services)
    {
        services.AddHttpClient<IPosduifClient, PosduifClient>((provider, httpClient) =>
        {
            var options = provider.GetRequiredService<IOptions<PosduifOptions>>().Value;

            if (!string.IsNullOrWhiteSpace(options.BaseUrl))
            {
                httpClient.BaseAddress = new Uri(options.BaseUrl);
            }
        });

        services.AddHostedService<NotificationDispatcherService>();

        return services;
    }
}
