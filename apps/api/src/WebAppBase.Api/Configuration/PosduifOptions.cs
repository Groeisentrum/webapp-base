namespace WebAppBase.Api.Configuration;

/// <summary>
/// Settings for outbound notification dispatch via Posduif.
/// </summary>
public sealed class PosduifOptions
{
    public const string SectionName = "Posduif";

    public string BaseUrl { get; set; } = string.Empty;

    public string ApiKey { get; set; } = string.Empty;

    /// <summary>When false, dispatches are recorded but never sent. Useful for local development.</summary>
    public bool Enabled { get; set; }
}
