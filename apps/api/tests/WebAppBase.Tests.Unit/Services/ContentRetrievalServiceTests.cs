using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using WebAppBase.Api.Configuration;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Domain.ValueObjects;
using WebAppBase.Api.Repositories;
using WebAppBase.Api.Services;
using WebAppBase.Tests.Unit.TestDoubles;

namespace WebAppBase.Tests.Unit.Services;

/// <summary>
/// Retrieval is exercised through a real <see cref="PublicContentService"/> over
/// substituted repositories rather than a stand-in read path. These tests exist to
/// prove that visibility, not the index, decides what a caller gets back — and a
/// substituted read path would prove nothing about that.
/// </summary>
public sealed class ContentRetrievalServiceTests
{
    private const long OpenCategoryId = 1;
    private const long StaffCategoryId = 2;

    private readonly IEmbeddingClient embeddingClient = Substitute.For<IEmbeddingClient>();
    private readonly IContentEmbeddingRepository embeddingRepository =
        Substitute.For<IContentEmbeddingRepository>();
    private readonly IContentRepository contentRepository = Substitute.For<IContentRepository>();
    private readonly ICategoryRepository categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly ITranslationRepository translationRepository = Substitute.For<ITranslationRepository>();
    private readonly ITenantSettingsRepository tenantSettingsRepository =
        Substitute.For<ITenantSettingsRepository>();
    private readonly ILocationDetailRepository locationDetailRepository =
        Substitute.For<ILocationDetailRepository>();
    private readonly IViewerContext viewerContext = Substitute.For<IViewerContext>();
    private readonly RetrievalOptions options = new() { Enabled = true, MaxResults = 5 };
    private readonly ContentRetrievalService retrievalService;

    public ContentRetrievalServiceTests()
    {
        tenantSettingsRepository.GetAsync(Arg.Any<CancellationToken>()).Returns(BuildSettings());

        // The MCP endpoint is unauthenticated, so this is the viewer every tool call sees.
        viewerContext.Current.Returns(Viewer.Anonymous);

        categoryRepository.GetAllAsync(Arg.Any<CancellationToken>()).Returns<IReadOnlyList<Category>>(
        [
            BuildCategory(OpenCategoryId, "Uitstallings", Visibility.Public),
            BuildCategory(StaffCategoryId, "Personeel", Visibility.Authenticated)
        ]);

        translationRepository.GetForEntitiesAsync(
                Arg.Any<string>(),
                Arg.Any<IReadOnlyCollection<long>>(),
                Arg.Any<string>(),
                Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<Translation>>([]);

        locationDetailRepository.GetForContentAsync(Arg.Any<long>(), Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<LocationDetail>>([]);

        embeddingClient.EmbedAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(new[] { 0.1f, 0.2f, 0.3f });

        retrievalService = new ContentRetrievalService(
            embeddingClient,
            embeddingRepository,
            new PublicContentService(
                contentRepository,
                categoryRepository,
                translationRepository,
                Substitute.For<IMenuItemRepository>(),
                tenantSettingsRepository,
                locationDetailRepository,
                viewerContext,
                FixedClock.Default()),
            Options.Create(options),
            NullLogger<ContentRetrievalService>.Instance);
    }

    /// <summary>
    /// A deployment without Bedrock access has no index at all, so searching is
    /// reported as switched off rather than answered with nothing found.
    /// </summary>
    [Fact]
    public async Task SearchAsync_WhenRetrievalDisabled_ReportsUnavailable()
    {
        options.Enabled = false;

        var result = await retrievalService.SearchAsync("openingstye", null, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Kind.Should().Be(ErrorKind.Unavailable);
        result.Error.Code.Should().Be(ErrorCodes.RetrievalUnavailable);
        await embeddingClient.DidNotReceive().EmbedAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task SearchAsync_WithBlankQuery_Fails(string query)
    {
        var result = await retrievalService.SearchAsync(query, null, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Kind.Should().Be(ErrorKind.Validation);
        result.Error.Code.Should().Be(ErrorCodes.ValidationFailed);
        await embeddingClient.DidNotReceive().EmbedAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    /// <summary>
    /// The whole point of the design. An item indexed while it was public, then moved
    /// behind a restricted category, must be dropped on the way out — and dropped in
    /// silence, so a search cannot be used to discover that it exists.
    /// </summary>
    [Fact]
    public async Task SearchAsync_WhenIndexReturnsRestrictedContent_OmitsIt()
    {
        StubContent(BuildContent(10, OpenCategoryId, "Ossewa"));
        StubContent(BuildContent(11, StaffCategoryId, "Sleutelkas"));
        StubMatches(
            new ContentEmbeddingMatch(11, "Die sleutelkas is agter die toonbank.", 0.01),
            new ContentEmbeddingMatch(10, "Die ossewa het die Groot Trek gery.", 0.22));

        var result = await retrievalService.SearchAsync("sleutels", null, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().ContainSingle().Which.Id.Should().Be(10);
    }

    /// <summary>
    /// The same staleness the other way round: the item is still public, but its
    /// publish window has closed since it was indexed.
    /// </summary>
    [Fact]
    public async Task SearchAsync_WhenIndexReturnsUnpublishedContent_OmitsIt()
    {
        StubContent(BuildContent(10, OpenCategoryId, "Ossewa"));
        StubContent(BuildContent(12, OpenCategoryId, "Ou aankondiging", published: false));
        StubMatches(
            new ContentEmbeddingMatch(12, "Die fees was verlede jaar.", 0.05),
            new ContentEmbeddingMatch(10, "Die ossewa het die Groot Trek gery.", 0.30));

        var result = await retrievalService.SearchAsync("fees", null, CancellationToken.None);

        result.Value.Should().ContainSingle().Which.Id.Should().Be(10);
    }

    /// <summary>
    /// A long page is indexed as several chunks, so one item can match repeatedly.
    /// The visitor gets it once, described by whichever chunk matched best.
    /// </summary>
    [Fact]
    public async Task SearchAsync_WithDuplicateChunksForOneItem_ReturnsItOnce()
    {
        StubContent(BuildContent(10, OpenCategoryId, "Ossewa"));
        StubMatches(
            new ContentEmbeddingMatch(10, "Die wa is in 1838 gebou.", 0.05),
            new ContentEmbeddingMatch(10, "Die wielnaaf is van geelhout.", 0.40));

        var result = await retrievalService.SearchAsync("ossewa", null, CancellationToken.None);

        result.Value.Should().ContainSingle();
        result.Value[0].Snippet.Should().Be("Die wa is in 1838 gebou.");
    }

    [Fact]
    public async Task SearchAsync_ReturnsNearestFirst()
    {
        StubContent(BuildContent(10, OpenCategoryId, "Ossewa"));
        StubContent(BuildContent(13, OpenCategoryId, "Smidswinkel"));
        StubMatches(
            new ContentEmbeddingMatch(13, "Die smid werk soggens.", 0.05),
            new ContentEmbeddingMatch(10, "Die wa is in 1838 gebou.", 0.40));

        var result = await retrievalService.SearchAsync("smid", null, CancellationToken.None);

        result.Value.Should().HaveCount(2);
        result.Value[0].Id.Should().Be(13);
        result.Value[1].Id.Should().Be(10);
    }

    [Fact]
    public async Task SearchAsync_ClampsLimitToConfiguredMaximum()
    {
        var matches = new List<ContentEmbeddingMatch>();

        for (var id = 20; id < 30; id++)
        {
            StubContent(BuildContent(id, OpenCategoryId, $"Item {id}"));
            matches.Add(new ContentEmbeddingMatch(id, $"Brokkie {id}", id / 100d));
        }

        StubMatches([.. matches]);

        var result = await retrievalService.SearchAsync("iets", 50, CancellationToken.None);

        result.Value.Should().HaveCount(options.MaxResults);
    }

    /// <summary>
    /// Visibility filtering runs after the index and drops rows, so the index must be
    /// asked for more than the caller wants — otherwise one restricted neighbour
    /// quietly shortens every answer.
    /// </summary>
    [Fact]
    public async Task SearchAsync_AsksTheIndexForMoreRowsThanItReturns()
    {
        StubContent(BuildContent(10, OpenCategoryId, "Ossewa"));
        StubMatches(new ContentEmbeddingMatch(10, "Die wa is in 1838 gebou.", 0.05));

        await retrievalService.SearchAsync("ossewa", 2, CancellationToken.None);

        await embeddingRepository.Received().SearchAsync(
            Arg.Any<float[]>(),
            Arg.Is<int>(limit => limit > 2),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task SearchAsync_ReportsTheCategoryPathAndPageUrl()
    {
        StubContent(BuildContent(10, OpenCategoryId, "Ossewa"));
        StubMatches(new ContentEmbeddingMatch(10, "Die wa is in 1838 gebou.", 0.05));

        var result = await retrievalService.SearchAsync("ossewa", null, CancellationToken.None);

        result.Value[0].CategoryPath.Should().Be("Uitstallings");
        result.Value[0].Url.Should().Be("/inhoud/10");
    }

    /// <summary>
    /// Reported as missing rather than forbidden: a 403 would confirm to the caller
    /// that the item exists, which is exactly what restricting it was meant to prevent.
    /// </summary>
    [Fact]
    public async Task GetAsync_ForHiddenContent_ReportsNotFound()
    {
        StubContent(BuildContent(11, StaffCategoryId, "Sleutelkas"));

        var result = await retrievalService.GetAsync(11, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Kind.Should().Be(ErrorKind.NotFound);
    }

    [Fact]
    public async Task GetAsync_ForVisibleContent_ReturnsItsBody()
    {
        StubContent(BuildContent(10, OpenCategoryId, "Ossewa"));

        var result = await retrievalService.GetAsync(10, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Title.Should().Be("Ossewa");
        result.Value.Body.Should().Be("Volledige teks oor Ossewa.");
    }

    private void StubContent(Content content) =>
        contentRepository.GetByIdAsync(content.Id, Arg.Any<CancellationToken>()).Returns(content);

    private void StubMatches(params ContentEmbeddingMatch[] matches) =>
        embeddingRepository
            .SearchAsync(Arg.Any<float[]>(), Arg.Any<int>(), Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<ContentEmbeddingMatch>>(matches);

    private static Content BuildContent(
        long id,
        long categoryId,
        string title,
        bool published = true,
        Visibility visibility = Visibility.Public) => new()
        {
            Id = id,
            CategoryId = categoryId,
            Title = title,
            Description = $"Kort beskrywing van {title}.",
            Body = $"Volledige teks oor {title}.",
            Visibility = visibility,
            PublishedAt = published ? FixedClock.DefaultInstant.AddDays(-1) : null
        };

    private static Category BuildCategory(long id, string name, Visibility visibility) => new()
    {
        Id = id,
        Name = name,
        Slug = name.ToLowerInvariant(),
        Visibility = visibility
    };

    private static TenantSettings BuildSettings() => new()
    {
        Id = 1,
        SiteName = "Toetswerf",
        DefaultLanguageCode = "af",
        ActiveLanguageCodes = ["af"]
    };
}
