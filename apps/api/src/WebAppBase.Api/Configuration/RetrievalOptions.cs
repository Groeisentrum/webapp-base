namespace WebAppBase.Api.Configuration;

/// <summary>
/// Settings for the content retrieval index and the MCP server that serves it.
/// </summary>
/// <remarks>
/// <see cref="Region"/> defaults to the Oom Paul region rather than the deployment's
/// own: ECR and EC2 live in af-south-1, which has no Bedrock. Embedding calls must go
/// wherever the harness already goes.
/// </remarks>
public sealed class RetrievalOptions
{
    public const string SectionName = "Retrieval";

    /// <summary>Off by default, so a deployment without Bedrock access simply has no index.</summary>
    public bool Enabled { get; set; }

    public string Region { get; set; } = "eu-west-1";

    public string EmbeddingModelId { get; set; } = "amazon.titan-embed-text-v2:0";

    /// <summary>Must match the VECTOR column width in the migration. Titan v2 supports 256, 512 and 1024.</summary>
    public int Dimensions { get; set; } = 1024;

    /// <summary>
    /// Shared secret the AgentCore Gateway presents on every MCP call. Empty closes
    /// the endpoint: an unconfigured deployment must not expose an open tool surface.
    /// </summary>
    public string McpApiKey { get; set; } = string.Empty;

    public int MaxResults { get; set; } = 5;
}
