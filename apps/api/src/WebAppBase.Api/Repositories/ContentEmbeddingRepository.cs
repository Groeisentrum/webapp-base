using System.Data;
using System.Data.Common;
using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using WebAppBase.Api.Data;

namespace WebAppBase.Api.Repositories;

/// <summary>
/// The vector index, over raw ADO.NET.
/// </summary>
/// <remarks>
/// This is the one place in the API that writes SQL by hand. The MySQL EF provider
/// cannot map MariaDB's VECTOR type, so <c>content_embeddings</c> is deliberately
/// outside the EF model — no entity, no configuration, no snapshot entry — and every
/// statement here is parameterised through <see cref="DbCommand"/> so nothing depends
/// on MySql.Data types.
///
/// Rows here are a lookup, never an authority: a match still has to be resolved and
/// visibility-filtered through the normal read path before it reaches a caller.
/// </remarks>
public sealed class ContentEmbeddingRepository(
    WebAppDbContext dbContext,
    ILogger<ContentEmbeddingRepository> logger) : IContentEmbeddingRepository
{
    private const int MinimumMajorVersion = 11;
    private const int MinimumMinorVersion = 7;

    private static readonly char[] VersionSeparators = ['.', '-'];

    public async Task<bool> SupportsVectorSearchAsync(CancellationToken cancellationToken)
    {
        string? version = null;

        try
        {
            var connection = await OpenConnectionAsync(cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT VERSION();";

            version = (await command.ExecuteScalarAsync(cancellationToken))?.ToString();
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception, "Could not read the database version; assuming no VECTOR support.");
            return false;
        }

        // The string is a free-form banner ("11.8.9-MariaDB-ubu2404"), so anything
        // unparseable means "no" rather than an exception on every start-up.
        if (!TryParseVersion(version, out var major, out var minor)
            || version!.IndexOf("MariaDB", StringComparison.OrdinalIgnoreCase) < 0)
        {
            logger.LogWarning("Database version '{Version}' is not a MariaDB with VECTOR support.", version);
            return false;
        }

        return major > MinimumMajorVersion
            || (major == MinimumMajorVersion && minor >= MinimumMinorVersion);
    }

    public async Task<IReadOnlyDictionary<long, string>> GetSourceHashesAsync(CancellationToken cancellationToken)
    {
        var connection = await OpenConnectionAsync(cancellationToken);

        await using var command = connection.CreateCommand();

        // Every chunk of one item shares the item's hash, so any one of them answers.
        command.CommandText = "SELECT ContentId, MIN(SourceHash) FROM content_embeddings GROUP BY ContentId;";

        var hashes = new Dictionary<long, string>();

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            if (!await reader.IsDBNullAsync(1, cancellationToken))
            {
                hashes[reader.GetInt64(0)] = reader.GetString(1);
            }
        }

        return hashes;
    }

    public async Task ReplaceForContentAsync(
        long contentId,
        string sourceHash,
        IReadOnlyList<ContentEmbeddingChunk> chunks,
        CancellationToken cancellationToken)
    {
        var connection = await OpenConnectionAsync(cancellationToken);

        // Replacing rather than updating keeps a changed chunk count correct: an edit
        // that shortens an item must leave no orphaned tail chunks behind.
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        await using (var delete = connection.CreateCommand())
        {
            delete.Transaction = transaction;
            delete.CommandText = "DELETE FROM content_embeddings WHERE ContentId = @contentId;";
            delete.Parameters.Add(Parameter(delete, "@contentId", contentId));

            await delete.ExecuteNonQueryAsync(cancellationToken);
        }

        foreach (var chunk in chunks)
        {
            await using var insert = connection.CreateCommand();
            insert.Transaction = transaction;
            insert.CommandText =
                """
                INSERT INTO content_embeddings
                    (ContentId, ChunkIndex, Chunk, SourceHash, Embedding, UpdatedAt)
                VALUES
                    (@contentId, @chunkIndex, @chunk, @sourceHash, VEC_FromText(@embedding), UTC_TIMESTAMP(6));
                """;

            insert.Parameters.Add(Parameter(insert, "@contentId", contentId));
            insert.Parameters.Add(Parameter(insert, "@chunkIndex", chunk.ChunkIndex));
            insert.Parameters.Add(Parameter(insert, "@chunk", chunk.Chunk));
            insert.Parameters.Add(Parameter(insert, "@sourceHash", sourceHash));
            insert.Parameters.Add(Parameter(insert, "@embedding", ToVectorText(chunk.Embedding)));

            await insert.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
    }

    public async Task DeleteAsync(IReadOnlyCollection<long> contentIds, CancellationToken cancellationToken)
    {
        if (contentIds.Count == 0)
        {
            return;
        }

        var connection = await OpenConnectionAsync(cancellationToken);

        await using var command = connection.CreateCommand();

        var names = new List<string>(contentIds.Count);
        var index = 0;

        foreach (var contentId in contentIds)
        {
            var name = $"@id{index++}";
            names.Add(name);
            command.Parameters.Add(Parameter(command, name, contentId));
        }

        command.CommandText = $"DELETE FROM content_embeddings WHERE ContentId IN ({string.Join(",", names)});";

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ContentEmbeddingMatch>> SearchAsync(
        float[] queryEmbedding,
        int limit,
        CancellationToken cancellationToken)
    {
        var connection = await OpenConnectionAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT ContentId, Chunk, VEC_DISTANCE_COSINE(Embedding, VEC_FromText(@query)) AS Distance
            FROM content_embeddings
            ORDER BY Distance
            LIMIT @limit;
            """;

        command.Parameters.Add(Parameter(command, "@query", ToVectorText(queryEmbedding)));
        command.Parameters.Add(Parameter(command, "@limit", limit));

        List<ContentEmbeddingMatch> matches = [];

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            matches.Add(new ContentEmbeddingMatch(reader.GetInt64(0), reader.GetString(1), reader.GetDouble(2)));
        }

        return matches;
    }

    /// <summary>
    /// The connection EF already holds, opened if it is not. It is never closed here:
    /// the scope that owns the context owns its lifetime.
    /// </summary>
    private async Task<DbConnection> OpenConnectionAsync(CancellationToken cancellationToken)
    {
        var connection = dbContext.Database.GetDbConnection();

        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
        }

        return connection;
    }

    /// <summary>
    /// MariaDB's text form for a vector, <c>[0.1,0.2]</c>. Round-trip formatting under
    /// the invariant culture, so a comma-decimal locale cannot corrupt the literal —
    /// and it travels as a parameter, never concatenated into the statement.
    /// </summary>
    private static string ToVectorText(float[] embedding)
    {
        var builder = new StringBuilder((embedding.Length * 12) + 2);
        builder.Append('[');

        for (var index = 0; index < embedding.Length; index++)
        {
            if (index > 0)
            {
                builder.Append(',');
            }

            builder.Append(embedding[index].ToString("R", CultureInfo.InvariantCulture));
        }

        builder.Append(']');

        return builder.ToString();
    }

    private static DbParameter Parameter(DbCommand command, string name, object value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.Value = value;

        return parameter;
    }

    private static bool TryParseVersion(string? version, out int major, out int minor)
    {
        major = 0;
        minor = 0;

        if (string.IsNullOrWhiteSpace(version))
        {
            return false;
        }

        var parts = version.Split(VersionSeparators, 3);

        return parts.Length >= 2
            && int.TryParse(parts[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out major)
            && int.TryParse(parts[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out minor);
    }
}
