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

    /// <summary>
    /// Bumped whenever the privacy policy wording changes. Stamped onto each consent
    /// record so you can always show which version a person agreed to.
    /// </summary>
    public string PrivacyPolicyVersion { get; set; } = "1.0";

    /// <summary>Bumped whenever the terms change. Stamped onto each consent record.</summary>
    public string TermsVersion { get; set; } = "1.0";

    /// <summary>
    /// Whether visitors may register themselves. Off by default so a deployment opts
    /// in deliberately rather than exposing signup by accident.
    /// </summary>
    public bool SelfRegistrationEnabled { get; set; }

    public FeatureFlags FeatureFlags { get; set; } = FeatureFlags.Empty();

    public Branding Branding { get; set; } = Branding.Empty();

    public ContactInfo ContactInfo { get; set; } = ContactInfo.Empty();

    /// <summary>True when the supplied language code is configured for this deployment.</summary>
    public bool SupportsLanguage(string languageCode) =>
        ActiveLanguageCodes.Contains(languageCode, StringComparer.OrdinalIgnoreCase);
}
