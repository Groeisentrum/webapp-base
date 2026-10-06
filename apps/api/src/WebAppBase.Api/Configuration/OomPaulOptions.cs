using System.Text.RegularExpressions;

namespace WebAppBase.Api.Configuration;

/// <summary>
/// Settings for invoking the Oom Paul harness in Bedrock AgentCore. The harness owns
/// the persona, system prompt and model choice — this only names which one to call.
/// </summary>
public sealed partial class OomPaulOptions
{
    public const string SectionName = "OomPaul";

    public string HarnessArn { get; set; } = string.Empty;

    public string Qualifier { get; set; } = "DEFAULT";

    public string Region { get; set; } = "eu-west-1";

    /// <summary>
    /// AgentCore's own constraint on an endpoint qualifier. Checked at startup so a
    /// typo refuses to boot rather than failing every visitor's first question.
    /// </summary>
    [GeneratedRegex("^[a-zA-Z][a-zA-Z0-9_]{0,47}$")]
    public static partial Regex QualifierPattern();
}
