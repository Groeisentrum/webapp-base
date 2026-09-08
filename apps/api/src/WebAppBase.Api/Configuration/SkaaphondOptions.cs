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

    /// <summary>
    /// Key sent when creating accounts. SkaapHond resolves it to a caller identity.
    /// Sourced from Parameter Store, never from a committed file.
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Numeric id of the role granted to self-registered visitors. SkaapHond assigns
    /// roles by id, not name, and the id differs per environment — so this must be
    /// configured per deployment. Zero disables self-registration outright.
    /// </summary>
    public int ClientRoleId { get; set; }

    /// <summary>Tenant dimension stamped on self-registered accounts. Required by SkaapHond.</summary>
    public int DataHolderId { get; set; }

    /// <summary>Business entity stamped on self-registered accounts. Required by SkaapHond.</summary>
    public int EntityId { get; set; }
}
