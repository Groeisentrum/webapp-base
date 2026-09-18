using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using WebAppBase.Api.Configuration;
using WebAppBase.Api.Data;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Extensions;
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
builder.Services.Configure<OomPaulOptions>(builder.Configuration.GetSection(OomPaulOptions.SectionName));

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
