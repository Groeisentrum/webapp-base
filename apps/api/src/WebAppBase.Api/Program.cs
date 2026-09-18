using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.AspNetCore;
using WebAppBase.Api.Configuration;
using WebAppBase.Api.Data;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Extensions;
using WebAppBase.Api.Mcp;
using WebAppBase.Api.Middleware;
using WebAppBase.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Deployed environments read configuration and secrets from SSM Parameter Store.
// Local development opts out via Configuration:UseParameterStore so a developer
// needs no AWS credentials to run the stack.
var useParameterStore = builder.Configuration.GetValue("Configuration:UseParameterStore", !builder.Environment.IsDevelopment());
if (useParameterStore)
{
    var parameterStorePath = builder.Configuration["Configuration:ParameterStorePath"]
        ?? "/GroeiSentrum/WebappBase/";

    builder.Configuration.AddSystemsManager(source =>
    {
        source.Path = parameterStorePath;
        source.Optional = false;
        source.ReloadAfter = TimeSpan.FromMinutes(5);
    });
}

builder.Services.Configure<DatabaseOptions>(builder.Configuration.GetSection(DatabaseOptions.SectionName));
builder.Services.Configure<SkaaphondOptions>(builder.Configuration.GetSection(SkaaphondOptions.SectionName));
builder.Services.Configure<PosduifOptions>(builder.Configuration.GetSection(PosduifOptions.SectionName));
// Validated at startup rather than on first use: an unparseable region or a
// malformed qualifier otherwise surfaces inside a DI factory mid-request, as a 500
// on a visitor's question rather than a refusal to boot.
builder.Services.AddOptions<OomPaulOptions>()
    .Bind(builder.Configuration.GetSection(OomPaulOptions.SectionName))
    .Validate(
        options => !string.IsNullOrWhiteSpace(options.Region),
        "OomPaul:Region must name an AWS region.")
    .Validate(
        options => OomPaulOptions.QualifierPattern().IsMatch(options.Qualifier),
        "OomPaul:Qualifier must start with a letter and contain only letters, digits and underscores.")
    .ValidateOnStart();

builder.Services.AddOptions<RetrievalOptions>()
    .Bind(builder.Configuration.GetSection(RetrievalOptions.SectionName))
    .Validate(
        options => options.Dimensions is 256 or 512 or 1024,
        "Retrieval:Dimensions must be 256, 512 or 1024, and must match the VECTOR column width.")
    .Validate(
        options => options.MaxResults > 0,
        "Retrieval:MaxResults must be at least one.")
    .Validate(
        options => !options.Enabled || !string.IsNullOrWhiteSpace(options.EmbeddingModelId),
        "Retrieval:EmbeddingModelId is required when retrieval is enabled.")
    .ValidateOnStart();

var databaseOptions = builder.Configuration.GetSection(DatabaseOptions.SectionName).Get<DatabaseOptions>()
    ?? new DatabaseOptions();
var skaaphondOptions = builder.Configuration.GetSection(SkaaphondOptions.SectionName).Get<SkaaphondOptions>()
    ?? new SkaaphondOptions();

builder.Services.AddWebAppPersistence(databaseOptions);
builder.Services.AddWebAppRepositories();
builder.Services.AddWebAppServices();
builder.Services.AddPosduifDispatch();
builder.Services.AddSkaaphondUserClient();
builder.Services.AddOomPaulChat();
builder.Services.AddContentRetrieval();
builder.Services.AddSiteContentMcpServer();
builder.Services.AddWebAppAuthentication(skaaphondOptions);

// Self-registration is anonymous and creates accounts upstream, so it is the obvious
// target for automated abuse. Partitioned by caller address rather than globally, so
// one abusive source cannot deny registration to everyone else.
builder.Services.AddRateLimiter(rateLimiter =>
{
    rateLimiter.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    rateLimiter.AddPolicy(RateLimitPolicies.Registration, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ResolvePartitionKey(context),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(15),
                QueueLimit = 0
            }));

    // Every turn is a billed model call, so this caps spend from one source rather
    // than blocking a real conversation's back-and-forth.
    rateLimiter.AddPolicy(RateLimitPolicies.OomPaulChat, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ResolvePartitionKey(context),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(5),
                QueueLimit = 0
            }));
});

// Keep the Async suffix in action names so nameof(...) in CreatedAtAction resolves;
// without this the framework trims it and the generated Location route fails to match.
builder.Services.AddControllers(options => options.SuppressAsyncSuffixInActionNames = false);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHealthChecks().AddCheck<DatabaseHealthCheck>("database");

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

var app = builder.Build();

// Fail fast: an instance that cannot bring its schema up to date must not serve traffic.
if (databaseOptions.MigrateOnStartup)
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<WebAppDbContext>();
    await dbContext.Database.MigrateAsync();
}

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

// The remote MCP server. Authorisation here is a shared secret rather than a
// visitor token: the caller is Bedrock AgentCore's gateway, not a person, and it
// reaches the API from outside rather than through the webhost.
// Grouped so the shared-secret filter covers every route the transport maps,
// present and future: MapMcp returns a convention builder that takes no filter
// of its own, and an endpoint the filter missed would be an open tool surface.
app.MapGroup("/mcp").AddEndpointFilter<McpApiKeyFilter>().MapMcp();

await app.RunAsync();

/// <summary>
/// Rate-limit partition key. Prefers the address nginx forwarded, since the API
/// otherwise sees only the proxy and would bucket every caller together.
/// </summary>
static string ResolvePartitionKey(HttpContext context)
{
    var forwardedFor = context.Request.Headers["X-Forwarded-For"].ToString();

    if (!string.IsNullOrWhiteSpace(forwardedFor))
    {
        return forwardedFor.Split(',', StringSplitOptions.TrimEntries)[0];
    }

    return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
}

/// <summary>
/// Exposed so the integration test host can reference the entry point assembly.
/// </summary>
public partial class Program;
