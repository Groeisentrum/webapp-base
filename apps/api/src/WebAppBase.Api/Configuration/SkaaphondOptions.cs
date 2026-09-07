namespace WebAppBase.Api.Configuration;

/// <summary>
/// Settings for validating the SkaapHond-issued JWTs this API receives.
/// </summary>
public sealed class SkaaphondOptions
{
    public const string SectionName = "Skaaphond";

    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>Signing key shared with SkaapHond. Sourced from Parameter Store in deployed environments.</summary>
    public string SigningKey { get; set; } = string.Empty;

    public string Issuer { get; set; } = string.Empty;

    public string Audience { get; set; } = string.Empty;

    /// <summary>
    /// Skips issuer/audience checks. Intended for local development against a
    /// dev token only; leaving this on in a deployed environment weakens token validation.
    /// </summary>
    public bool AllowUnverifiedTokens { get; set; }
}
