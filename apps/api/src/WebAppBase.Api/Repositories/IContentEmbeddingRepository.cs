namespace WebAppBase.Api.Repositories;

/// <summary>
/// The vector index over published content.
/// </summary>
/// <remarks>
/// The table lives outside the EF model: the MySQL provider cannot map MariaDB's
/// VECTOR type, so this repository is the only thing that touches it and everything
/// here goes through raw SQL.
///
/// Rows here are a lookup, never an authority. A match must still be resolved and
/// visibility-filtered through the normal read path before it reaches a caller.
/// </remarks>
public interface IContentEmbeddingRepository
{
    /// <summary>
    /// False when the server predates MariaDB 11.7 and has no VECTOR support, so the
    /// indexer can disable itself with one clear log line instead of failing per row.
    /// </summary>
    Task<bool> SupportsVectorSearchAsync(CancellationToken cancellationToken);

    /// <summary>Content id to the hash of the text last embedded for it.</summary>
    Task<IReadOnlyDictionary<long, string>> GetSourceHashesAsync(CancellationToken cancellationToken);

    /// <summary>Replaces every chunk held for one content item, as a single transaction.</summary>
    Task ReplaceForContentAsync(
        long contentId,
        string sourceHash,
        IReadOnlyList<ContentEmbeddingChunk> chunks,
        CancellationToken cancellationToken);

    /// <summary>Drops content that is gone, unpublished, or no longer public.</summary>
    Task DeleteAsync(IReadOnlyCollection<long> contentIds, CancellationToken cancellationToken);

    /// <summary>Nearest chunks by cosine distance, closest first.</summary>
    Task<IReadOnlyList<ContentEmbeddingMatch>> SearchAsync(
        float[] queryEmbedding,
        int limit,
        CancellationToken cancellationToken);
}

/// <summary>One embedded slice of a content item.</summary>
public sealed record ContentEmbeddingChunk(int ChunkIndex, string Chunk, float[] Embedding);

/// <summary>A chunk the index considers close to a query. Distance is cosine: lower is nearer.</summary>
public sealed record ContentEmbeddingMatch(long ContentId, string Chunk, double Distance);
