using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebAppBase.Api.Configuration;
using WebAppBase.Api.Data;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Repositories;

namespace WebAppBase.Api.Services;

/// <summary>
/// Keeps the vector index in step with what the public site actually shows.
/// </summary>
/// <remarks>
/// Only public, currently published content is embedded, and only when every category
/// above it is public too. An indexed chunk is retrievable text, so anything the site
/// would hide must never reach the index in the first place — an item that becomes
/// restricted or unpublished is dropped on the next tick.
/// </remarks>
public sealed class ContentIndexerService(
    IServiceScopeFactory scopeFactory,
    IOptions<RetrievalOptions> options,
    IClock clock,
    ILogger<ContentIndexerService> logger) : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(60);
    private const string PathSeparator = " › ";

    private bool vectorSupportConfirmed;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.Enabled)
        {
            logger.LogInformation("Content retrieval is disabled; nothing will be indexed.");
            return;
        }

        using var timer = new PeriodicTimer(PollInterval);

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                if (!await RunOnceAsync(stoppingToken))
                {
                    break;
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                // Keep the indexer alive: one bad tick must not stop every future one.
                logger.LogError(exception, "Content indexing tick failed.");
            }
        }
    }

    /// <summary>
    /// One indexing pass. False means stop for good — the feature is off, or the server
    /// cannot do vector search. Public so a test can drive a tick without a timer.
    /// </summary>
    public async Task<bool> RunOnceAsync(CancellationToken cancellationToken)
    {
        if (!options.Value.Enabled)
        {
            return false;
        }

        using var scope = scopeFactory.CreateScope();
        var embeddingRepository = scope.ServiceProvider.GetRequiredService<IContentEmbeddingRepository>();

        if (!vectorSupportConfirmed)
        {
            if (!await embeddingRepository.SupportsVectorSearchAsync(cancellationToken))
            {
                // One clear line beats a failure per row for the life of the process.
                logger.LogError(
                    "Content indexing stopped: the database has no VECTOR support, which needs MariaDB 11.7 or later.");

                return false;
            }

            vectorSupportConfirmed = true;
        }

        await IndexAsync(scope, embeddingRepository, cancellationToken);

        return true;
    }

    private async Task IndexAsync(
        IServiceScope scope,
        IContentEmbeddingRepository embeddingRepository,
        CancellationToken cancellationToken)
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<WebAppDbContext>();
        var embeddingClient = scope.ServiceProvider.GetRequiredService<IEmbeddingClient>();

        var now = clock.UtcNow;

        var categories = await dbContext.Categories.ToListAsync(cancellationToken);
        var (paths, publicCategoryIds) = BuildCategoryIndex(categories);

        // The publish window is tested in SQL so a tick never drags the whole table back.
        var published = await dbContext.ContentItems
            .Where(content => content.Visibility == Visibility.Public
                && content.PublishedAt != null
                && content.PublishedAt <= now
                && (content.UnpublishedAt == null || content.UnpublishedAt > now))
            .ToListAsync(cancellationToken);

        // A public item under a restricted section is still hidden: restrictions cascade
        // down the tree, and an item's own setting may only narrow access, never widen it.
        var eligible = published
            .Where(content => publicCategoryIds.Contains(content.CategoryId))
            .ToList();

        // ponytail: a whole-table hash scan per tick is fine at heritage-site scale
        // (hundreds of rows). Drive it off Content.UpdatedAt past roughly 10k items.
        var storedHashes = await embeddingRepository.GetSourceHashesAsync(cancellationToken);

        foreach (var content in eligible)
        {
            try
            {
                await IndexOneAsync(
                    embeddingRepository,
                    embeddingClient,
                    content,
                    paths.GetValueOrDefault(content.CategoryId, string.Empty),
                    storedHashes,
                    cancellationToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogWarning(exception, "Could not index content {ContentId}.", content.Id);
            }
        }

        // Whatever the index still holds but the site no longer shows has to go: this is
        // what removes an item the moment it is unpublished, restricted or deleted.
        var eligibleIds = eligible.Select(content => content.Id).ToHashSet();
        var stale = storedHashes.Keys.Where(contentId => !eligibleIds.Contains(contentId)).ToArray();

        await embeddingRepository.DeleteAsync(stale, cancellationToken);
    }

    private static async Task IndexOneAsync(
        IContentEmbeddingRepository embeddingRepository,
        IEmbeddingClient embeddingClient,
        Content content,
        string categoryPath,
        IReadOnlyDictionary<long, string> storedHashes,
        CancellationToken cancellationToken)
    {
        var sourceHash = ContentChunker.HashSource(categoryPath, content.Title, content.Description, content.Body);

        if (storedHashes.TryGetValue(content.Id, out var storedHash) && storedHash == sourceHash)
        {
            return;
        }

        var chunks = ContentChunker.Chunk(categoryPath, content.Title, content.Description, content.Body);
        var embedded = new List<ContentEmbeddingChunk>(chunks.Count);

        for (var index = 0; index < chunks.Count; index++)
        {
            var embedding = await embeddingClient.EmbedAsync(chunks[index], cancellationToken);
            embedded.Add(new ContentEmbeddingChunk(index, chunks[index], embedding));
        }

        await embeddingRepository.ReplaceForContentAsync(content.Id, sourceHash, embedded, cancellationToken);
    }

    /// <summary>
    /// The display path of every category, root first, and the ids whose whole ancestry
    /// is public. Both come from one walk up the parent chain, guarded against a cycle.
    /// </summary>
    private static (Dictionary<long, string> Paths, HashSet<long> PublicCategoryIds) BuildCategoryIndex(
        IReadOnlyList<Category> categories)
    {
        var byId = categories.ToDictionary(category => category.Id);
        var paths = new Dictionary<long, string>(categories.Count);
        var publicCategoryIds = new HashSet<long>();

        foreach (var category in categories)
        {
            List<string> names = [];
            var visited = new HashSet<long>();
            var wholeChainIsPublic = true;
            long? currentId = category.Id;

            while (currentId is not null
                && byId.TryGetValue(currentId.Value, out var current)
                && visited.Add(currentId.Value))
            {
                names.Add(current.Name);
                wholeChainIsPublic &= current.Visibility == Visibility.Public;
                currentId = current.ParentCategoryId;
            }

            names.Reverse();
            paths[category.Id] = string.Join(PathSeparator, names);

            if (wholeChainIsPublic)
            {
                publicCategoryIds.Add(category.Id);
            }
        }

        return (paths, publicCategoryIds);
    }
}
