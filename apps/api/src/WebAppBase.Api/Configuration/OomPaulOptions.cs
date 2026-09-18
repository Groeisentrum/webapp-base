namespace WebAppBase.Api.Configuration;

/// <summary>
/// Settings for invoking the Oom Paul harness in Bedrock AgentCore. The harness owns
/// the persona, system prompt and model choice — this only names which one to call.
/// </summary>
public sealed class OomPaulOptions
{
    public const string SectionName = "OomPaul";

    public string HarnessArn { get; set; } = string.Empty;

    public string Qualifier { get; set; } = "DEFAULT";

    public string Region { get; set; } = "eu-west-1";
}
