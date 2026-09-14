namespace WebAppBase.Api.Models.Responses;

/// <summary>
/// The deployment's configuration as returned to admin clients.
/// </summary>
public sealed record TenantSettingsResponse(
    long Id,
    string SiteName,
    string DefaultLanguageCode,
    IReadOnlyList<string> ActiveLanguageCodes,
    string PrivacyPolicyVersion,
    string TermsVersion,
    bool SelfRegistrationEnabled,
    IReadOnlyDictionary<string, bool> FeatureFlags,
    BrandingResponse Branding,
    ContactInfoResponse ContactInfo,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public sealed record BrandingResponse(
    string? PrimaryColour,
    string? SecondaryColour,
    string? AccentColour,
    string? HeadingFont,
    string? BodyFont,
    string? LogoReference,
    string? FaviconReference);

public sealed record ContactInfoResponse(
    string? EmailAddress,
    string? PhoneNumber,
    string? PhysicalAddress,
    string? PostalAddress,
    IReadOnlyDictionary<string, string> SocialLinks);
