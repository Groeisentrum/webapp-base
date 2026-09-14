using System.ComponentModel.DataAnnotations;

namespace WebAppBase.Api.Models.Requests;

/// <summary>
/// Replaces the deployment's configuration. Admin only.
/// </summary>
public sealed class UpdateTenantSettingsRequest
{
    [Required]
    [MaxLength(200)]
    public string SiteName { get; set; } = string.Empty;

    [Required]
    [MaxLength(16)]
    public string DefaultLanguageCode { get; set; } = string.Empty;

    /// <summary>Language codes this deployment publishes in. Must contain the default.</summary>
    [Required]
    [MinLength(1)]
    public IReadOnlyList<string> ActiveLanguageCodes { get; set; } = [];

    /// <summary>Bump when the privacy policy wording changes; stamped onto new consent records.</summary>
    [Required]
    [MaxLength(32)]
    public string PrivacyPolicyVersion { get; set; } = "1.0";

    /// <summary>Bump when the terms change; stamped onto new consent records.</summary>
    [Required]
    [MaxLength(32)]
    public string TermsVersion { get; set; } = "1.0";

    /// <summary>Whether visitors may register themselves and receive the Client role.</summary>
    public bool SelfRegistrationEnabled { get; set; }

    public IReadOnlyDictionary<string, bool> FeatureFlags { get; set; } = new Dictionary<string, bool>();

    public BrandingRequest Branding { get; set; } = new();

    public ContactInfoRequest ContactInfo { get; set; } = new();
}

public sealed class BrandingRequest
{
    [MaxLength(32)]
    public string? PrimaryColour { get; set; }

    [MaxLength(32)]
    public string? SecondaryColour { get; set; }

    [MaxLength(32)]
    public string? AccentColour { get; set; }

    [MaxLength(100)]
    public string? HeadingFont { get; set; }

    [MaxLength(100)]
    public string? BodyFont { get; set; }

    [MaxLength(2048)]
    public string? LogoReference { get; set; }

    [MaxLength(2048)]
    public string? FaviconReference { get; set; }
}

public sealed class ContactInfoRequest
{
    [MaxLength(320)]
    public string? EmailAddress { get; set; }

    [MaxLength(50)]
    public string? PhoneNumber { get; set; }

    [MaxLength(500)]
    public string? PhysicalAddress { get; set; }

    [MaxLength(500)]
    public string? PostalAddress { get; set; }

    /// <summary>
    /// Platform key to profile URL. Left open rather than a fixed set of fields so a
    /// deployment can add a platform by configuring it.
    /// </summary>
    public Dictionary<string, string>? SocialLinks { get; set; }
}
