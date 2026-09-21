using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using WebAppBase.Api.Data;
using WebAppBase.Api.Services;

namespace WebAppBase.Tests.Integration.Infrastructure;

/// <summary>
/// Boots the API in-process against an isolated in-memory store.
/// </summary>
/// <remarks>
/// Each factory instance gets its own database name so test classes running in
/// parallel cannot see each other's rows. Neither AWS nor a live MySQL server is
/// needed to run the suite.
/// </remarks>
public sealed class WebAppApiFactory : WebApplicationFactory<Program>
{
    private readonly string databaseName = $"webapp-base-tests-{Guid.NewGuid()}";

    static WebAppApiFactory() => ApplyStartupConfiguration();

    /// <summary>The shared secret the MCP endpoint is configured with for these tests.</summary>
    public const string McpApiKey = "integration-test-mcp-key";

    public RecordingPosduifClient PosduifClient { get; } = new();

    public RecordingOomPaulLlmClient OomPaulLlmClient { get; } = new();

    public WebAppDbContext CreateDbContext()
    {
        var scope = Services.CreateScope();

        return scope.ServiceProvider.GetRequiredService<WebAppDbContext>();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(Environments.Development);

        builder.ConfigureTestServices(services =>
        {
            ReplaceDbContextWithInMemory(services, databaseName);

            // Replace SkaapHond token validation with a header-driven stand-in so role
            // gating is exercised end to end without minting real JWTs.
            services.AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });

            services.RemoveAll<IPosduifClient>();
            services.AddSingleton<IPosduifClient>(PosduifClient);

            // Keeps the suite's promise that no AWS call is needed to run it: the
            // chat endpoint is otherwise the one path that would reach Bedrock.
            services.RemoveAll<IOomPaulLlmClient>();
            services.AddSingleton<IOomPaulLlmClient>(OomPaulLlmClient);
        });
    }

    /// <summary>
    /// Program.cs reads these settings while composing the builder, which is before
    /// the factory's own configuration sources are applied. Environment variables are
    /// read by the default builder, so they are the only override that lands in time.
    /// </summary>
    private static void ApplyStartupConfiguration()
    {
        Environment.SetEnvironmentVariable("Configuration__UseParameterStore", "false");
        Environment.SetEnvironmentVariable("Database__MigrateOnStartup", "false");
        Environment.SetEnvironmentVariable(
            "Database__ConnectionString",
            "server=unused;database=unused;user=unused;password=unused");
        Environment.SetEnvironmentVariable(
            "Skaaphond__SigningKey",
            "integration-test-signing-key-at-least-32-bytes-long");
        Environment.SetEnvironmentVariable("Skaaphond__AllowUnverifiedTokens", "true");
        Environment.SetEnvironmentVariable("Posduif__Enabled", "false");

        // A harness ARN so the chat endpoint is configured; the client behind it is
        // replaced above, so nothing in this ARN is ever dialled.
        Environment.SetEnvironmentVariable(
            "OomPaul__HarnessArn",
            "arn:aws:bedrock-agentcore:eu-west-1:000000000000:harness/integration-test");

        // Retrieval stays off — there is no MariaDB here to hold a vector index — but
        // the MCP endpoint still needs a key, since an unset one closes it entirely
        // and its authentication is what these tests check.
        Environment.SetEnvironmentVariable("Retrieval__Enabled", "false");
        Environment.SetEnvironmentVariable("Retrieval__McpApiKey", McpApiKey);
    }

    private static void ReplaceDbContextWithInMemory(IServiceCollection services, string databaseName)
    {
        // Leaving any of these in place lets the MySQL provider's options action run
        // alongside the in-memory one, which EF rejects as two providers on one context.
        services.RemoveAll<DbContextOptions<WebAppDbContext>>();
        services.RemoveAll<DbContextOptions>();
        services.RemoveAll<IDbContextOptionsConfiguration<WebAppDbContext>>();
        services.RemoveAll<WebAppDbContext>();

        services.AddDbContext<WebAppDbContext>(options => options.UseInMemoryDatabase(databaseName));
    }
}
