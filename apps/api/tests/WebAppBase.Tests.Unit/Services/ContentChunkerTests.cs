using WebAppBase.Api.Services;

namespace WebAppBase.Tests.Unit.Services;

public sealed class ContentChunkerTests
{
    private const string CategoryPath = "Besoek › Geskiedenis";
    private const string Title = "Die ou fort";
    private const string Header = $"{CategoryPath}\n{Title}";

    [Fact]
    public void Chunk_WithShortContent_ReturnsOneChunkCarryingThePathAndTitle()
    {
        var chunks = ContentChunker.Chunk(CategoryPath, Title, "Kort beskrywing.", "Kort liggaam.");

        chunks.Should().ContainSingle();
        chunks[0].Should().Contain(CategoryPath).And.Contain(Title);
    }

    /// <summary>
    /// A blank description or body must vanish entirely rather than leave empty lines
    /// behind: those lines would land in the embedded text and in the hash.
    /// </summary>
    [Fact]
    public void Chunk_WithNullDescriptionAndBody_SkipsThemCleanly()
    {
        var chunks = ContentChunker.Chunk(CategoryPath, Title, null, "   ");

        chunks.Should().ContainSingle();
        chunks[0].Should().Be($"{CategoryPath}\n\n{Title}");
    }

    [Fact]
    public void Chunk_WithLongBody_RepeatsThePathAndTitleOnEveryChunk()
    {
        var chunks = ContentChunker.Chunk(CategoryPath, Title, null, BuildLongBody());

        chunks.Count.Should().BeGreaterThan(1);
        chunks.Should().AllSatisfy(chunk => chunk.Should().StartWith(Header));
    }

    [Fact]
    public void Chunk_WithLongBody_KeepsEveryChunkUnderTheCeiling()
    {
        var chunks = ContentChunker.Chunk(CategoryPath, Title, null, BuildLongBody());

        chunks.Should().AllSatisfy(chunk =>
            chunk.Length.Should().BeLessThanOrEqualTo(ContentChunker.SingleChunkLength));
    }

    /// <summary>
    /// A chunk that ends mid-word hands the model a fragment that means nothing, so
    /// every word of the source must survive a split intact.
    /// </summary>
    [Fact]
    public void Chunk_WithLongBody_NeverSplitsAWord()
    {
        var chunks = ContentChunker.Chunk(CategoryPath, Title, null, BuildLongBody());

        var words = chunks
            .SelectMany(chunk => chunk.Split([' ', '\n'], StringSplitOptions.RemoveEmptyEntries))
            .Where(word => word.StartsWith("woord", StringComparison.Ordinal));

        words.Should().AllSatisfy(word => word.Should().HaveLength(9));
    }

    [Fact]
    public void HashSource_ForIdenticalInput_IsStable()
    {
        var first = ContentChunker.HashSource(CategoryPath, Title, "Beskrywing", "Liggaam");
        var second = ContentChunker.HashSource(CategoryPath, Title, "Beskrywing", "Liggaam");

        first.Should().Be(second);
        first.Should().MatchRegex("^[0-9a-f]{64}$");
    }

    /// <summary>
    /// The hash is the only thing that tells the indexer an item needs re-embedding,
    /// so an edit anywhere in the embedded text has to move it.
    /// </summary>
    [Fact]
    public void HashSource_WhenBodyChanges_Differs()
    {
        var before = ContentChunker.HashSource(CategoryPath, Title, "Beskrywing", "Liggaam");
        var after = ContentChunker.HashSource(CategoryPath, Title, "Beskrywing", "Hersiene liggaam");

        before.Should().NotBe(after);
    }

    [Fact]
    public void HashSource_WhenTheCategoryPathChanges_Differs()
    {
        var before = ContentChunker.HashSource(CategoryPath, Title, null, "Liggaam");
        var after = ContentChunker.HashSource("Besoek › Natuur", Title, null, "Liggaam");

        before.Should().NotBe(after);
    }

    /// <summary>Distinct nine-character words, so a mid-word split is visible as a short word.</summary>
    private static string BuildLongBody() =>
        string.Join(" ", Enumerable.Range(1, 400).Select(number => $"woord{number:0000}"));
}
