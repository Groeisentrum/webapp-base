using Amazon;
using Amazon.BedrockAgentCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;
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
        services.AddDbContext<WebAppDbContext>(options => options
            .UseMySQL(databaseOptions.ConnectionString)
            // The provider's own history repository cannot take its migration lock on
            // MariaDB. See MariaDbHistoryRepository for why.
            .ReplaceService<IHistoryRepository, MariaDbHistoryRepository>());

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
        services.AddScoped<IViewerContext, HttpViewerContext>();
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
        services.AddScoped<RegistrationService>();

        return services;
    }

    /// <summary>
    /// Registers the SkaapHond account-creation client. Separate from authentication:
    /// this is the only outbound call that writes to SkaapHond.
    /// </summary>
    public static IServiceCollection AddSkaaphondUserClient(this IServiceCollection services)
    {
        services.AddHttpClient<ISkaaphondUserClient, SkaaphondUserClient>(ConfigureSkaaphondClient);
        services.AddHttpClient<ISkaaphondOtpClient, SkaaphondOtpClient>(ConfigureSkaaphondClient);

        return services;
    }

    private static void ConfigureSkaaphondClient(IServiceProvider provider, HttpClient httpClient)
    {
        var options = provider.GetRequiredService<IOptions<SkaaphondOptions>>().Value;

        if (!string.IsNullOrWhiteSpace(options.BaseUrl))
        {
            httpClient.BaseAddress = new Uri(options.BaseUrl);
        }
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


    /// <summary>
    /// Registers the Bedrock AgentCore client and the Oom Paul chat service. The
    /// AWS client is a singleton, matching AWS's own guidance that its service
    /// clients are thread-safe and expensive to construct per request.
    /// </summary>
    public static IServiceCollection AddOomPaulChat(this IServiceCollection services)
    {
        services.AddSingleton<IAmazonBedrockAgentCore>(provider =>
        {
            var options = provider.GetRequiredService<IOptions<OomPaulOptions>>().Value;

            return new AmazonBedrockAgentCoreClient(RegionEndpoint.GetBySystemName(options.Region));
        });

        services.AddSingleton<IOomPaulLlmClient, OomPaulLlmClient>();
        services.AddScoped<OomPaulChatService>();

        return services;
    }
}
