using WebAppBase.Api.Domain.ValueObjects;

namespace WebAppBase.Api.Domain.Entities;

/// <summary>
/// Single-row configuration for a deployment. Everything that differs between
/// client deployments lives here rather than in code.
/// </summary>
public class TenantSettings : AuditableEntity
{
    public string SiteName { get; set; } = string.Empty;

    /// <summary>Language content falls back to when a translation is missing.</summary>
    public string DefaultLanguageCode { get; set; } = string.Empty;

    /// <summary>Language codes this deployment publishes in, including the default.</summary>
    public IReadOnlyList<string> ActiveLanguageCodes { get; set; } = [];

    public FeatureFlags FeatureFlags { get; set; } = FeatureFlags.Empty();

    public Branding Branding { get; set; } = Branding.Empty();

    public ContactInfo ContactInfo { get; set; } = ContactInfo.Empty();

    /// <summary>True when the supplied language code is configured for this deployment.</summary>
    public bool SupportsLanguage(string languageCode) =>
        ActiveLanguageCodes.Contains(languageCode, StringComparer.OrdinalIgnoreCase);
}
