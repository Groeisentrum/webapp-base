namespace WebAppBase.Api.Configuration;

/// <summary>
/// Database connection settings. Sourced from SSM Parameter Store in deployed
/// environments and from environment variables locally — never from a committed file.
/// </summary>
public sealed class DatabaseOptions
{
    public const string SectionName = "Database";

    public string ConnectionString { get; set; } = string.Empty;

    /// <summary>
    /// Applies pending migrations during startup. Enabled by default so a fresh
    /// instance is self-provisioning; startup fails loudly if migration fails.
    /// </summary>
    public bool MigrateOnStartup { get; set; } = true;
}
