using System.Data;
using System.Data.Common;
using Microsoft.EntityFrameworkCore.Migrations;

namespace WebAppBase.Api.Data;

/// <summary>
/// The migrations history repository, with a migration lock MariaDB will actually grant.
/// </summary>
/// <remarks>
/// The MySQL provider takes the startup migration lock with <c>GET_LOCK(name, -1)</c>.
/// MySQL reads a negative timeout as "wait indefinitely". MariaDB does not: it returns
/// NULL, which the provider casts to a long and dies on — before a single migration
/// runs, on every start, against any MariaDB. The cast failure is the symptom; the
/// dialect difference is the cause.
///
/// The provider's own repository is internal, so it cannot be subclassed to fix the one
/// method. This replaces it, keeping the lock's purpose intact — two instances starting
/// together must not migrate the same schema at once — with a timeout MariaDB accepts.
/// </remarks>
public sealed class MariaDbHistoryRepository(HistoryRepositoryDependencies dependencies)
    : HistoryRepository(dependencies)
{
    private const string LockName = "__EFMigrationsLock";

    /// <summary>Long enough for a slow first-boot migration, short enough to surface a deadlock.</summary>
    private const int LockTimeoutSeconds = 300;

    /// <summary>
    /// The lock outlives no transaction and no connection reset — it is held by name until
    /// RELEASE_LOCK, so releasing it is this class's own job.
    /// </summary>
    public override LockReleaseBehavior LockReleaseBehavior => LockReleaseBehavior.Explicit;

    protected override string ExistsSql =>
        "SELECT 1 FROM information_schema.tables "
        + $"WHERE table_schema = DATABASE() AND table_name = '{TableName}';";

    public override IMigrationsDatabaseLock AcquireDatabaseLock()
    {
        var connection = Dependencies.Connection.DbConnection;

        if (connection.State != ConnectionState.Open)
        {
            connection.Open();
        }

        using var command = CreateCommand(connection, $"SELECT GET_LOCK('{LockName}', {LockTimeoutSeconds});");

        return WasGranted(command.ExecuteScalar())
            ? new DatabaseLock(connection, this)
            : throw LockTimedOut();
    }

    public override async Task<IMigrationsDatabaseLock> AcquireDatabaseLockAsync(
        CancellationToken cancellationToken = default)
    {
        var connection = Dependencies.Connection.DbConnection;

        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
        }

        await using var command = CreateCommand(connection, $"SELECT GET_LOCK('{LockName}', {LockTimeoutSeconds});");

        return WasGranted(await command.ExecuteScalarAsync(cancellationToken))
            ? new DatabaseLock(connection, this)
            : throw LockTimedOut();
    }

    protected override bool InterpretExistsResult(object? value) => value is not null and not DBNull;

    public override string GetCreateIfNotExistsScript()
    {
        var script = GetCreateScript();

        // Built from the same model and the same provider SQL generator as the plain
        // create, so the table shape stays whatever the provider says it is.
        return script.Replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ", StringComparison.Ordinal);
    }

    public override string GetBeginIfNotExistsScript(string migrationId) => throw NotScriptable();

    public override string GetBeginIfExistsScript(string migrationId) => throw NotScriptable();

    public override string GetEndIfScript() => throw NotScriptable();

    /// <summary>
    /// Only idempotent script generation calls these, and this deployment migrates on
    /// startup instead. Throwing beats returning MySQL-shaped guesses that would look
    /// like a working script right up until someone ran it.
    /// </summary>
    private static NotSupportedException NotScriptable() => new(
        "This deployment migrates on startup and does not generate idempotent migration "
        + "scripts. Use 'dotnet ef migrations script' against the provider's own tooling "
        + "if a script is ever needed.");

    /// <summary>1 is granted, 0 timed out, NULL is an error — only the first will do.</summary>
    private static bool WasGranted(object? result) =>
        result is not null and not DBNull && Convert.ToInt64(result) == 1;

    private static DbCommand CreateCommand(DbConnection connection, string commandText)
    {
        var command = connection.CreateCommand();
        command.CommandText = commandText;

        return command;
    }

    private static InvalidOperationException LockTimedOut() => new(
        $"Could not acquire the '{LockName}' migration lock within {LockTimeoutSeconds} seconds. "
        + "Another instance is probably still migrating this database.");

    /// <summary>Releases the named lock whichever way the caller disposes it.</summary>
    private sealed class DatabaseLock(DbConnection connection, IHistoryRepository historyRepository)
        : IMigrationsDatabaseLock
    {
        public IHistoryRepository HistoryRepository => historyRepository;

        public void Dispose()
        {
            using var command = CreateCommand(connection, $"SELECT RELEASE_LOCK('{LockName}');");
            command.ExecuteNonQuery();
        }

        public async ValueTask DisposeAsync()
        {
            await using var command = CreateCommand(connection, $"SELECT RELEASE_LOCK('{LockName}');");
            await command.ExecuteNonQueryAsync();
        }
    }
}
