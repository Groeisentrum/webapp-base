namespace WebAppBase.Api.Services;

/// <summary>
/// Turns text into a vector. One call, one embedding — batching is the caller's
/// business, since the indexer and the query path batch very differently.
/// </summary>
public interface IEmbeddingClient
{
    Task<float[]> EmbedAsync(string text, CancellationToken cancellationToken);
}
