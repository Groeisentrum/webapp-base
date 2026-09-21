using Amazon;
using Amazon.BedrockAgentCore;
using Amazon.BedrockRuntime;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Options;
using WebAppBase.Api.Configuration;
using WebAppBase.Api.Data;
using WebAppBase.Api.Mcp;
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
        services.AddScoped<IContentEmbeddingRepository, ContentEmbeddingRepository>();

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

    /// <summary>
    /// Registers the content retrieval index: the Bedrock embedding client, the
    /// vector repository, the query service, and the background indexer.
    /// </summary>
    /// <remarks>
    /// The Bedrock region is deliberately its own setting rather than the
    /// deployment's: ECR and EC2 live in af-south-1, which has no Bedrock at all.
    ///
    /// The indexer is registered whether or not retrieval is enabled — it reads the
    /// flag itself and exits with one log line, which is a clearer signal than a
    /// hosted service that silently was never there.
    /// </remarks>
    public static IServiceCollection AddContentRetrieval(this IServiceCollection services)
    {
        services.AddSingleton<IAmazonBedrockRuntime>(provider =>
        {
            var options = provider.GetRequiredService<IOptions<RetrievalOptions>>().Value;

            return new AmazonBedrockRuntimeClient(RegionEndpoint.GetBySystemName(options.Region));
        });

        services.AddSingleton<IEmbeddingClient, EmbeddingClient>();
        services.AddScoped<ContentRetrievalService>();
        services.AddHostedService<ContentIndexerService>();

        return services;
    }

    /// <summary>
    /// Registers the remote MCP server that exposes this deployment's published
    /// content as tools.
    /// </summary>
    /// <remarks>
    /// Left on the transport's stateless default: every gateway call is independent,
    /// so there is no session affinity to arrange and a restart costs a caller nothing.
    /// </remarks>
    public static IServiceCollection AddSiteContentMcpServer(this IServiceCollection services)
    {
        services.AddMcpServer()
            .WithHttpTransport()
            .WithTools<SiteContentTools>();

        return services;
    }
}
