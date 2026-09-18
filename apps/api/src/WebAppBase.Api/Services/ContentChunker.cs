using System.Security.Cryptography;
using System.Text;

namespace WebAppBase.Api.Services;

/// <summary>
/// Turns one content item into the text slices that get embedded, and into the hash
/// that says whether those slices are still current.
/// </summary>
/// <remarks>
/// The category path leads every slice. A visitor standing in front of a display asks
/// section-level questions ("wat kan ek hier sien?"), which match the path far better
/// than an item's own wording — and repeating it means no slice of a split item is
/// left without the context that says what it belongs to.
/// </remarks>
public static class ContentChunker
{
    /// <summary>Assembled text at or under this length is embedded as a single chunk.</summary>
    public const int SingleChunkLength = 1500;

    private const int ChunkContentLength = 1000;
    private const string ParagraphSeparator = "\n\n";
    private static readonly char[] WordBreaks = [' ', '\t', '\n'];

    /// <summary>The slices to embed for one item, in order.</summary>
    public static IReadOnlyList<string> Chunk(string categoryPath, string title, string? description, string? body)
    {
        var assembled = Assemble(categoryPath, title, description, body);

        if (assembled.Length <= SingleChunkLength)
        {
            return [assembled];
        }

        // ponytail: paragraph-boundary splitting at a fixed size. Upgrade path is a
        // token-aware splitter, worth it only once recall actually measures badly.
        var header = Join("\n", categoryPath, title);
        var content = Join(ParagraphSeparator, description, body);

        List<string> chunks = [];
        var current = new StringBuilder();

        var paragraphs = content.Split(
            ParagraphSeparator,
            StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        foreach (var piece in paragraphs.SelectMany(SplitToBudget))
        {
            if (current.Length > 0 && current.Length + ParagraphSeparator.Length + piece.Length > ChunkContentLength)
            {
                chunks.Add(Join(ParagraphSeparator, header, current.ToString()));
                current.Clear();
            }

            if (current.Length > 0)
            {
                current.Append(ParagraphSeparator);
            }

            current.Append(piece);
        }

        if (current.Length > 0)
        {
            chunks.Add(Join(ParagraphSeparator, header, current.ToString()));
        }

        return chunks;
    }

    /// <summary>
    /// Identifies the text currently embedded for an item. The indexer re-embeds only
    /// when this moves, so it must cover everything that reaches a chunk.
    /// </summary>
    public static string HashSource(string categoryPath, string title, string? description, string? body) =>
        Convert.ToHexStringLower(
            SHA256.HashData(Encoding.UTF8.GetBytes(Assemble(categoryPath, title, description, body))));

    private static string Assemble(string categoryPath, string title, string? description, string? body) =>
        Join(ParagraphSeparator, categoryPath, Join("\n", title, description, body));

    /// <summary>
    /// Joins the parts that carry text, dropping the rest so a missing description
    /// leaves no blank line behind. Line endings are normalised on the way through:
    /// an editor round-tripping CRLF is not an edit and must not re-embed the item.
    /// </summary>
    private static string Join(string separator, params string?[] parts) =>
        string.Join(separator, parts.Where(part => !string.IsNullOrWhiteSpace(part)))
            .Replace("\r\n", "\n");

    /// <summary>
    /// Cuts an over-long paragraph at whitespace, so no chunk ever ends mid-word.
    /// </summary>
    private static IEnumerable<string> SplitToBudget(string paragraph)
    {
        var start = 0;

        while (start < paragraph.Length)
        {
            if (paragraph.Length - start <= ChunkContentLength)
            {
                yield return paragraph[start..];
                yield break;
            }

            var window = paragraph.Substring(start, ChunkContentLength);
            var breakAt = window.LastIndexOfAny(WordBreaks);

            // A single token longer than the budget offers nowhere to cut; splitting it
            // beats growing a chunk without bound.
            if (breakAt <= 0)
            {
                breakAt = ChunkContentLength;
            }

            var piece = window[..breakAt].TrimEnd();

            if (piece.Length > 0)
            {
                yield return piece;
            }

            start += breakAt;

            while (start < paragraph.Length && char.IsWhiteSpace(paragraph[start]))
            {
                start++;
            }
        }
    }
}
