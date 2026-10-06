using Microsoft.Extensions.Options;
using WebAppBase.Api.Configuration;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Api.Repositories;

namespace WebAppBase.Api.Services;

/// <summary>
/// Finds the passages of this site's content that answer a visitor's question, for
/// Oom Paul to quote from.
/// </summary>
/// <remarks>
/// Two questions are asked here, by two different components, always in this order.
/// The vector index answers "what is probably relevant" — it is a lookup built at
/// index time and nothing more, never an authority on access. <see cref="PublicContentService"/>
/// answers "what may this caller see", and it runs after the index, on every single
/// match, before anything reaches the caller.
///
/// An item restricted or unpublished since it was indexed therefore comes back as
/// missing from that second step and is dropped in silence — never surfaced, never
/// reported, never counted — so a search cannot be used to discover that it exists.
/// </remarks>
public sealed class ContentRetrievalService(
    IEmbeddingClient embeddingClient,
    IContentEmbeddingRepository embeddingRepository,
    PublicContentService publicContentService,
    IOptions<RetrievalOptions> options,
    ILogger<ContentRetrievalService> logger)
{
    /// <summary>
    /// Visibility filtering runs after the index and drops rows, so the index is asked
    /// for more than the caller wants. Without the headroom one restricted neighbour
    /// quietly shortens every answer.
    /// </summary>
    private const int OverFetchFactor = 4;

    /// <summary>Each surviving match costs a content read, so the over-fetch is capped.</summary>
    private const int OverFetchCeiling = 50;

    public async Task<Result<IReadOnlyList<RetrievedContent>>> SearchAsync(
        string query,
        int? limit,
        CancellationToken cancellationToken)
    {
        var settings = options.Value;

        if (!settings.Enabled)
        {
            return Result<IReadOnlyList<RetrievedContent>>.Failure(Error.Unavailable(
                ErrorCodes.RetrievalUnavailable,
                "Soek is nie vir hierdie werf beskikbaar nie."));
        }

        if (string.IsNullOrWhiteSpace(query))
        {
            return Result<IReadOnlyList<RetrievedContent>>.Failure(Error.Validation(
                ErrorCodes.ValidationFailed,
                "Gee asseblief iets om na te soek."));
        }

        var maximum = Math.Max(1, settings.MaxResults);
        var take = Math.Clamp(limit ?? maximum, 1, maximum);

        var queryEmbedding = await embeddingClient.EmbedAsync(query.Trim(), cancellationToken);

        var matches = await embeddingRepository.SearchAsync(
            queryEmbedding,
            Math.Min(take * OverFetchFactor, OverFetchCeiling),
            cancellationToken);

        var visible = new List<(PublicContentResponse Content, ContentEmbeddingMatch Match)>(take);
        var seen = new HashSet<long>();

        foreach (var match in matches)
        {
            if (visible.Count == take)
            {
                break;
            }

            // Matches arrive nearest first, so the first chunk seen for an item is its
            // best one and any later chunk of the same item is a worse duplicate.
            if (!seen.Add(match.ContentId))
            {
                continue;
            }

            var content = await publicContentService.GetByIdAsync(match.ContentId, null, cancellationToken);

            if (content.IsFailure)
            {
                // The index has outlived what it indexed. That is ordinary, and it is
                // not the caller's business: logged for whoever tunes the indexer,
                // invisible to whoever asked.
                logger.LogDebug(
                    "Retrieval dropped indexed content {ContentId}: {ErrorCode}.",
                    match.ContentId,
                    content.Error!.Code);

                continue;
            }

            visible.Add((content.Value, match));
        }

        if (visible.Count == 0)
        {
            return Result<IReadOnlyList<RetrievedContent>>.Success([]);
        }

        var categoryPaths = await ResolveCategoryPathsAsync(cancellationToken);

        return Result<IReadOnlyList<RetrievedContent>>.Success(
        [
            .. visible.Select(found => Map(found.Content, categoryPaths, found.Match.Chunk, found.Match.Distance))
        ]);
    }

    public async Task<Result<RetrievedContent>> GetAsync(long id, CancellationToken cancellationToken)
    {
        var content = await publicContentService.GetByIdAsync(id, null, cancellationToken);

        if (content.IsFailure)
        {
            // Passed through untouched. The read path already reports a hidden item as
            // missing, and re-labelling it here would confirm that it exists.
            return Result<RetrievedContent>.Failure(content.Error!);
        }

        var categoryPaths = await ResolveCategoryPathsAsync(cancellationToken);

        return Result<RetrievedContent>.Success(Map(content.Value, categoryPaths, null, null));
    }

    /// <summary>
    /// Readable trails such as "Uitstallings / Vervoer", built from the same filtered
    /// tree the site navigates — so a path can never name a category the caller is not
    /// allowed to know about.
    /// </summary>
    private async Task<Dictionary<long, string>> ResolveCategoryPathsAsync(CancellationToken cancellationToken)
    {
        var tree = await publicContentService.GetCategoryTreeAsync(null, cancellationToken);
        var paths = new Dictionary<long, string>();

        if (tree.IsSuccess)
        {
            Collect(tree.Value, null, paths);
        }

        return paths;

        static void Collect(
            IReadOnlyList<CategoryTreeNodeResponse> nodes,
            string? prefix,
            Dictionary<long, string> paths)
        {
            foreach (var node in nodes)
            {
                var path = prefix is null ? node.Name : $"{prefix} / {node.Name}";
                paths[node.Id] = path;
                Collect(node.Children, path, paths);
            }
        }
    }

    private static RetrievedContent Map(
        PublicContentResponse content,
        Dictionary<long, string> categoryPaths,
        string? snippet,
        double? distance) => new(
        content.Id,
        content.Title,
        content.Description,
        content.Body,
        categoryPaths.GetValueOrDefault(content.CategoryId),
        $"/inhoud/{content.Id}",
        snippet,
        distance);
}

/// <summary>
/// One content item as retrieval hands it over: the page's own text, the trail that
/// leads to it, and the URL a visitor can be sent to.
/// </summary>
/// <remarks>
/// <see cref="Snippet"/> and <see cref="Distance"/> are set only for a search hit —
/// they describe the chunk that matched, not the item.
/// </remarks>
public sealed record RetrievedContent(
    long Id,
    string Title,
    string? Description,
    string? Body,
    string? CategoryPath,
    string Url,
    string? Snippet,
    double? Distance);
