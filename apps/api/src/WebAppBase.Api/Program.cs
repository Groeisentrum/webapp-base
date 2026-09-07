using Microsoft.EntityFrameworkCore;
using WebAppBase.Api.Configuration;
using WebAppBase.Api.Data;
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

var databaseOptions = builder.Configuration.GetSection(DatabaseOptions.SectionName).Get<DatabaseOptions>()
    ?? new DatabaseOptions();
var skaaphondOptions = builder.Configuration.GetSection(SkaaphondOptions.SectionName).Get<SkaaphondOptions>()
    ?? new SkaaphondOptions();

builder.Services.AddWebAppPersistence(databaseOptions);
builder.Services.AddWebAppRepositories();
builder.Services.AddWebAppServices();
builder.Services.AddPosduifDispatch();
builder.Services.AddWebAppAuthentication(skaaphondOptions);

builder.Services.AddControllers();
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

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

await app.RunAsync();

/// <summary>
/// Exposed so the integration test host can reference the entry point assembly.
/// </summary>
public partial class Program;
