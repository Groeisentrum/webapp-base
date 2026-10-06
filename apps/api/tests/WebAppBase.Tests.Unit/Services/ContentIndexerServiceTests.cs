using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using WebAppBase.Api.Configuration;
using WebAppBase.Api.Data;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Repositories;
using WebAppBase.Api.Services;
using WebAppBase.Tests.Unit.TestDoubles;

namespace WebAppBase.Tests.Unit.Services;

public sealed class ContentIndexerServiceTests : IDisposable
{
    private const long PublicCategoryId = 2;
    private const long RestrictedCategoryId = 3;
    private const long VisibleContentId = 10;
    private const string VisiblePath = "Besoek › Geskiedenis";
    private const string VisibleTitle = "Die ou fort";
    private const string VisibleDescription = "Die oudste gebou op die terrein.";
    private const string VisibleBody = "Gebou in 1896 en herstel in 2019.";

    private static readonly DateTimeOffset Now = FixedClock.DefaultInstant;

    private readonly WebAppDbContext dbContext;
    private readonly IEmbeddingClient embeddingClient = Substitute.For<IEmbeddingClient>();
    private readonly IContentEmbeddingRepository embeddingRepository =
        Substitute.For<IContentEmbeddingRepository>();
    private readonly IServiceScopeFactory scopeFactory;

    public ContentIndexerServiceTests()
    {
        var contextOptions = new DbContextOptionsBuilder<WebAppDbContext>()
            .UseInMemoryDatabase($"indexer-{Guid.NewGuid()}")
            .Options;

        dbContext = new WebAppDbContext(contextOptions);

        var services = new ServiceCollection();
        services.AddSingleton(dbContext);
        services.AddSingleton(embeddingClient);
        services.AddSingleton(embeddingRepository);

        scopeFactory = services.BuildServiceProvider().GetRequiredService<IServiceScopeFactory>();

        embeddingRepository.SupportsVectorSearchAsync(Arg.Any<CancellationToken>()).Returns(true);
        embeddingRepository.GetSourceHashesAsync(Arg.Any<CancellationToken>())
            .Returns((IReadOnlyDictionary<long, string>)new Dictionary<long, string>());
        embeddingClient.EmbedAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(new[] { 0.1f, 0.2f });

        SeedCategories();
    }

    public void Dispose() => dbContext.Dispose();

    /// <summary>
    /// An indexed chunk is retrievable text, so anything the site would hide must never
    /// reach the index at all — including a public item sitting under a restricted
    /// section, because restrictions cascade down the tree.
    /// </summary>
    [Fact]
    public async Task RunOnceAsync_WithHiddenContent_NeverEmbedsIt()
    {
        await SeedContentAsync(
            BuildContent(21, PublicCategoryId, visibility: Visibility.Restricted),
            BuildContent(22, PublicCategoryId, visibility: Visibility.Authenticated),
            BuildContent(23, PublicCategoryId, published: false),
            BuildContent(24, PublicCategoryId, unpublishedAt: Now.AddDays(-1)),
            BuildContent(25, RestrictedCategoryId));

        await BuildIndexer().RunOnceAsync(CancellationToken.None);

        await embeddingClient.DidNotReceive().EmbedAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
        await embeddingRepository.DidNotReceive().ReplaceForContentAsync(
            Arg.Any<long>(),
            Arg.Any<string>(),
            Arg.Any<IReadOnlyList<ContentEmbeddingChunk>>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RunOnceAsync_WithDisabledOptions_IndexesNothing()
    {
        await SeedVisibleContentAsync();

        var keepRunning = await BuildIndexer(enabled: false).RunOnceAsync(CancellationToken.None);

        keepRunning.Should().BeFalse();
        await embeddingClient.DidNotReceive().EmbedAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    /// <summary>
    /// A server without VECTOR support fails every insert, so the indexer stops after
    /// one line rather than logging a failure per row for the life of the process.
    /// </summary>
    [Fact]
    public async Task RunOnceAsync_WithoutVectorSupport_IndexesNothing()
    {
        await SeedVisibleContentAsync();
        embeddingRepository.SupportsVectorSearchAsync(Arg.Any<CancellationToken>()).Returns(false);

        var keepRunning = await BuildIndexer().RunOnceAsync(CancellationToken.None);

        keepRunning.Should().BeFalse();
        await embeddingClient.DidNotReceive().EmbedAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RunOnceAsync_WithVisibleContent_EmbedsItUnderItsCategoryPath()
    {
        await SeedVisibleContentAsync();

        await BuildIndexer().RunOnceAsync(CancellationToken.None);

        await embeddingClient.Received().EmbedAsync(
            Arg.Is<string>(chunk => chunk.Contains(VisiblePath) && chunk.Contains(VisibleTitle)),
            Arg.Any<CancellationToken>());
        await embeddingRepository.Received(1).ReplaceForContentAsync(
            VisibleContentId,
            VisibleHash(VisibleBody),
            Arg.Is<IReadOnlyList<ContentEmbeddingChunk>>(chunks => chunks.Count == 1),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RunOnceAsync_WithUnchangedHash_DoesNotReEmbed()
    {
        await SeedVisibleContentAsync();
        StoreHashes(new Dictionary<long, string> { [VisibleContentId] = VisibleHash(VisibleBody) });

        await BuildIndexer().RunOnceAsync(CancellationToken.None);

        await embeddingClient.DidNotReceive().EmbedAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
        await embeddingRepository.DidNotReceive().ReplaceForContentAsync(
            Arg.Any<long>(),
            Arg.Any<string>(),
            Arg.Any<IReadOnlyList<ContentEmbeddingChunk>>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RunOnceAsync_WithChangedBody_ReEmbeds()
    {
        await SeedVisibleContentAsync();
        StoreHashes(new Dictionary<long, string> { [VisibleContentId] = VisibleHash("Die ou teks.") });

        await BuildIndexer().RunOnceAsync(CancellationToken.None);

        await embeddingRepository.Received(1).ReplaceForContentAsync(
            VisibleContentId,
            VisibleHash(VisibleBody),
            Arg.Any<IReadOnlyList<ContentEmbeddingChunk>>(),
            Arg.Any<CancellationToken>());
    }

    /// <summary>
    /// Dropping what the site no longer shows is what retracts an item from retrieval
    /// the moment it is unpublished, restricted or deleted.
    /// </summary>
    [Fact]
    public async Task RunOnceAsync_WithContentNoLongerEligible_DeletesItFromTheIndex()
    {
        await SeedVisibleContentAsync();
        StoreHashes(new Dictionary<long, string>
        {
            [VisibleContentId] = VisibleHash(VisibleBody),
            [99] = "verouderd"
        });

        await BuildIndexer().RunOnceAsync(CancellationToken.None);

        await embeddingRepository.Received(1).DeleteAsync(
            Arg.Is<IReadOnlyCollection<long>>(ids => ids.Contains(99L) && !ids.Contains(VisibleContentId)),
            Arg.Any<CancellationToken>());
    }

    private ContentIndexerService BuildIndexer(bool enabled = true) => new(
        scopeFactory,
        Options.Create(new RetrievalOptions { Enabled = enabled }),
        FixedClock.Default(),
        NullLogger<ContentIndexerService>.Instance);

    private void StoreHashes(Dictionary<long, string> hashes) =>
        embeddingRepository.GetSourceHashesAsync(Arg.Any<CancellationToken>())
            .Returns((IReadOnlyDictionary<long, string>)hashes);

    private static string VisibleHash(string body) =>
        ContentChunker.HashSource(VisiblePath, VisibleTitle, VisibleDescription, body);

    private void SeedCategories()
    {
        dbContext.Categories.AddRange(
            new Category { Id = 1, Name = "Besoek", Slug = "besoek" },
            new Category
            {
                Id = PublicCategoryId,
                ParentCategoryId = 1,
                Name = "Geskiedenis",
                Slug = "geskiedenis"
            },
            new Category
            {
                Id = RestrictedCategoryId,
                ParentCategoryId = 1,
                Name = "Argief",
                Slug = "argief",
                Visibility = Visibility.Restricted
            });

        dbContext.SaveChanges();
    }

    private Task SeedVisibleContentAsync() =>
        SeedContentAsync(BuildContent(VisibleContentId, PublicCategoryId));

    private async Task SeedContentAsync(params Content[] items)
    {
        dbContext.ContentItems.AddRange(items);
        await dbContext.SaveChangesAsync();
    }

    private static Content BuildContent(
        long id,
        long categoryId,
        Visibility visibility = Visibility.Public,
        bool published = true,
        DateTimeOffset? unpublishedAt = null) => new()
        {
            Id = id,
            CategoryId = categoryId,
            Visibility = visibility,
            Title = VisibleTitle,
            Description = VisibleDescription,
            Body = VisibleBody,
            PublishedAt = published ? Now.AddDays(-1) : null,
            UnpublishedAt = unpublishedAt
        };
}
