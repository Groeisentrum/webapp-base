using System.ComponentModel;
using System.Text;
using ModelContextProtocol.Server;
using WebAppBase.Api.Services;

namespace WebAppBase.Api.Mcp;

/// <summary>
/// The tools Oom Paul may call against this deployment: a search over the site's
/// published content, and a full read of one item.
/// </summary>
/// <remarks>
/// A thin adapter over <see cref="ContentRetrievalService"/> with no rules of its own.
/// Calls arrive without a visitor's token, so the viewer is anonymous and only public
/// content is ever reachable here — the ordinary read path enforces that, and nothing
/// in this class may relax it.
/// </remarks>
[McpServerToolType]
public sealed class SiteContentTools
{
    [McpServerTool(Name = "search_site_content")]
    [Description("Search this site's published visitor information — exhibits, opening times, facilities, events. Returns the most relevant passages with the page each came from.")]
    public static async Task<string> SearchSiteContent(
        ContentRetrievalService retrieval,
        [Description("What to look for, in the visitor's own words.")] string query,
        [Description("How many passages to return (1-5).")] int limit = 5,
        CancellationToken cancellationToken = default)
    {
        var result = await retrieval.SearchAsync(query, limit, cancellationToken);

        // A failed result comes back as a sentence rather than an McpException:
        // throwing aborts the agent's turn, where text lets it carry on and tell the
        // visitor what happened.
        if (result.IsFailure)
        {
            return result.Error!.Message;
        }

        return result.Value.Count == 0
            ? "No matching content found."
            : string.Join("\n\n", result.Value.Select(item => Describe(item, item.Snippet ?? item.Description)));
    }

    [McpServerTool(Name = "get_site_content")]
    [Description("Read one page of this site's visitor information in full, by the id returned from search_site_content.")]
    public static async Task<string> GetSiteContent(
        ContentRetrievalService retrieval,
        [Description("The id of the content item to read.")] long id,
        CancellationToken cancellationToken = default)
    {
        var result = await retrieval.GetAsync(id, cancellationToken);

        if (result.IsFailure)
        {
            return result.Error!.Message;
        }

        var item = result.Value;
        var text = string.Join(
            "\n\n",
            new[] { item.Description, item.Body }.Where(part => !string.IsNullOrWhiteSpace(part)));

        return Describe(item, text);
    }

    /// <summary>
    /// Labelled lines rather than JSON: a language model reads these, and plain labels
    /// stay legible when a long answer is truncated part-way through.
    /// </summary>
    private static string Describe(RetrievedContent item, string? text)
    {
        var description = new StringBuilder();

        description.Append("Title: ").AppendLine(item.Title);

        if (!string.IsNullOrWhiteSpace(item.CategoryPath))
        {
            description.Append("Category: ").AppendLine(item.CategoryPath);
        }

        description.Append("URL: ").AppendLine(item.Url);

        if (!string.IsNullOrWhiteSpace(text))
        {
            description.AppendLine(text);
        }

        return description.ToString().TrimEnd();
    }
}
