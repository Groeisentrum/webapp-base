using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Domain.ValueObjects;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Api.Repositories;

namespace WebAppBase.Api.Services;

/// <summary>
/// Reads and updates the deployment's configuration.
/// </summary>
public sealed class TenantSettingsService(
    ITenantSettingsRepository tenantSettingsRepository,
    IAuditService auditService,
    INotificationService notificationService,
    IUnitOfWork unitOfWork,
    IClock clock)
{
    public async Task<Result<TenantSettingsResponse>> GetAsync(CancellationToken cancellationToken)
    {
        var settings = await tenantSettingsRepository.GetAsync(cancellationToken);

        return settings is null
            ? Result<TenantSettingsResponse>.Failure(NotInitialised())
            : Result<TenantSettingsResponse>.Success(MapResponse(settings));
    }

    public async Task<Result<PublicSiteConfigResponse>> GetPublicConfigAsync(CancellationToken cancellationToken)
    {
        var settings = await tenantSettingsRepository.GetAsync(cancellationToken);

        return settings is null
            ? Result<PublicSiteConfigResponse>.Failure(NotInitialised())
            : Result<PublicSiteConfigResponse>.Success(MapPublicResponse(settings));
    }

    public async Task<Result<TenantSettingsResponse>> UpdateAsync(
        UpdateTenantSettingsRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateLanguages(request);
        if (validationError is not null)
        {
            return Result<TenantSettingsResponse>.Failure(validationError);
        }

        var settings = await tenantSettingsRepository.GetAsync(cancellationToken);
        var isCreation = settings is null;

        var previousState = isCreation ? null : MapResponse(settings!);

        settings ??= new TenantSettings { CreatedAt = clock.UtcNow };

        ApplyUpdate(settings, request);

        if (isCreation)
        {
            tenantSettingsRepository.Add(settings);
        }
        else
        {
            settings.UpdatedAt = clock.UtcNow;
        }

        var newState = MapResponse(settings);

        auditService.Record(
            EntityTypeNames.TenantSettings,
            settings.Id,
            isCreation ? AuditAction.Created : AuditAction.Updated,
            previousState,
            newState);

        notificationService.Queue(NotificationTypes.TenantSettingsChanged, null);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<TenantSettingsResponse>.Success(MapResponse(settings));
    }

    private static Error NotInitialised() => Error.NotFound(
        ErrorCodes.TenantSettingsNotInitialised,
        "Die werf se instellings is nog nie opgestel nie.");

    /// <summary>
    /// The default language must be one of the active languages, otherwise content
    /// would fall back to a language the deployment does not publish in.
    /// </summary>
    private static Error? ValidateLanguages(UpdateTenantSettingsRequest request)
    {
        var activeLanguages = request.ActiveLanguageCodes;

        if (activeLanguages.Count == 0)
        {
            return Error.Validation(
                ErrorCodes.UnsupportedLanguage,
                "Kies ten minste een aktiewe taal.");
        }

        var containsDefault = activeLanguages.Contains(request.DefaultLanguageCode, StringComparer.OrdinalIgnoreCase);

        return containsDefault
            ? null
            : Error.Validation(
                ErrorCodes.UnsupportedLanguage,
                "Die verstektaal moet een van die aktiewe tale wees.");
    }

    private static void ApplyUpdate(TenantSettings settings, UpdateTenantSettingsRequest request)
    {
        settings.SiteName = request.SiteName;
        settings.DefaultLanguageCode = request.DefaultLanguageCode;
        settings.ActiveLanguageCodes = [.. request.ActiveLanguageCodes];
        settings.PrivacyPolicyVersion = request.PrivacyPolicyVersion;
        settings.TermsVersion = request.TermsVersion;
        settings.SelfRegistrationEnabled = request.SelfRegistrationEnabled;
        settings.FeatureFlags = new FeatureFlags(request.FeatureFlags);
        settings.Branding = MapBranding(request.Branding);
        settings.ContactInfo = MapContactInfo(request.ContactInfo);
    }

    private static Branding MapBranding(BrandingRequest request) => new()
    {
        PrimaryColour = request.PrimaryColour,
        SecondaryColour = request.SecondaryColour,
        AccentColour = request.AccentColour,
        HeadingFont = request.HeadingFont,
        BodyFont = request.BodyFont,
        LogoReference = request.LogoReference,
        FaviconReference = request.FaviconReference
    };

    private static ContactInfo MapContactInfo(ContactInfoRequest request) => new()
    {
        EmailAddress = request.EmailAddress,
        PhoneNumber = request.PhoneNumber,
        PhysicalAddress = request.PhysicalAddress,
        PostalAddress = request.PostalAddress,
        SocialLinks = request.SocialLinks is null
            ? new Dictionary<string, string>()
            : new Dictionary<string, string>(request.SocialLinks)
    };

    private static TenantSettingsResponse MapResponse(TenantSettings settings) => new(
        settings.Id,
        settings.SiteName,
        settings.DefaultLanguageCode,
        settings.ActiveLanguageCodes,
        settings.PrivacyPolicyVersion,
        settings.TermsVersion,
        settings.SelfRegistrationEnabled,
        settings.FeatureFlags.Flags,
        MapBrandingResponse(settings.Branding),
        MapContactInfoResponse(settings.ContactInfo),
        settings.CreatedAt,
        settings.UpdatedAt);

    private static PublicSiteConfigResponse MapPublicResponse(TenantSettings settings) => new(
        settings.SiteName,
        settings.DefaultLanguageCode,
        settings.ActiveLanguageCodes,
        settings.FeatureFlags.Flags,
        MapBrandingResponse(settings.Branding),
        MapContactInfoResponse(settings.ContactInfo));

    private static BrandingResponse MapBrandingResponse(Branding branding) => new(
        branding.PrimaryColour,
        branding.SecondaryColour,
        branding.AccentColour,
        branding.HeadingFont,
        branding.BodyFont,
        branding.LogoReference,
        branding.FaviconReference);

    private static ContactInfoResponse MapContactInfoResponse(ContactInfo contactInfo) => new(
        contactInfo.EmailAddress,
        contactInfo.PhoneNumber,
        contactInfo.PhysicalAddress,
        contactInfo.PostalAddress,
        contactInfo.SocialLinks);
}
