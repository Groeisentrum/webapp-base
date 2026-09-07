namespace WebAppBase.Api.Models.Responses;

/// <summary>
/// The subset of tenant configuration safe to expose to anonymous visitors —
/// what the public site needs to render itself, with nothing operational attached.
/// </summary>
public sealed record PublicSiteConfigResponse(
    string SiteName,
    string DefaultLanguageCode,
    IReadOnlyList<string> ActiveLanguageCodes,
    IReadOnlyDictionary<string, bool> FeatureFlags,
    BrandingResponse Branding,
    ContactInfoResponse ContactInfo);
