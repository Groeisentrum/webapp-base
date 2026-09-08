using Microsoft.Extensions.Options;
using WebAppBase.Api.Configuration;
using WebAppBase.Api.Data;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Api.Repositories;

namespace WebAppBase.Api.Services;

/// <summary>
/// Registers site visitors and records the consent that permits it.
/// </summary>
public sealed class RegistrationService(
    WebAppDbContext dbContext,
    ITenantSettingsRepository tenantSettingsRepository,
    ISkaaphondUserClient skaaphondUserClient,
    IOptions<SkaaphondOptions> skaaphondOptions,
    IUnitOfWork unitOfWork,
    IClock clock,
    ILogger<RegistrationService> logger)
{
    public async Task<Result<RegistrationAvailabilityResponse>> GetAvailabilityAsync(
        CancellationToken cancellationToken)
    {
        var settings = await tenantSettingsRepository.GetAsync(cancellationToken);

        var isEnabled = settings is not null
            && settings.SelfRegistrationEnabled
            && skaaphondOptions.Value.ClientRoleId > 0;

        return Result<RegistrationAvailabilityResponse>.Success(
            new RegistrationAvailabilityResponse(isEnabled));
    }

    public async Task<Result<RegistrationResponse>> RegisterAsync(
        RegisterClientRequest request,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken)
    {
        if (!request.ConsentToPrivacyPolicy || !request.AcceptTerms)
        {
            return Result<RegistrationResponse>.Failure(Error.Validation(
                ErrorCodes.ConsentRequired,
                "Jy moet die privaatheidsbeleid en bepalings aanvaar om te registreer."));
        }

        var settings = await tenantSettingsRepository.GetAsync(cancellationToken);
        if (settings is null || !settings.SelfRegistrationEnabled)
        {
            return Result<RegistrationResponse>.Failure(Error.Validation(
                ErrorCodes.RegistrationDisabled,
                "Registrasie is nie vir hierdie werf beskikbaar nie."));
        }

        // Without a role id a new account would carry no role, and SkaapHond issues
        // tokens whose role claim this app reads — such an account could sign in but
        // reach nothing. Refuse rather than create it.
        if (skaaphondOptions.Value.ClientRoleId <= 0)
        {
            logger.LogError("Self-registration is enabled but Skaaphond:ClientRoleId is not configured.");

            return Result<RegistrationResponse>.Failure(Error.Validation(
                ErrorCodes.RegistrationDisabled,
                "Registrasie is nie vir hierdie werf beskikbaar nie."));
        }

        // Recorded before the account exists, so there can never be an account without
        // evidence of consent. A failed registration leaves an unlinked record, which
        // is retained deliberately as a trail of attempts.
        var consentRecord = new ConsentRecord
        {
            Email = request.Email,
            UserName = request.UserName,
            PrivacyPolicyVersion = settings.PrivacyPolicyVersion,
            TermsVersion = settings.TermsVersion,
            ConsentedAt = clock.UtcNow,
            IpAddress = ipAddress,
            UserAgent = Truncate(userAgent, UserAgentMaxLength)
        };

        dbContext.ConsentRecords.Add(consentRecord);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var creation = await skaaphondUserClient.CreateClientUserAsync(
            request.UserName,
            request.Email,
            request.Password,
            cancellationToken);

        if (!creation.Succeeded)
        {
            logger.LogWarning(
                "Registration failed for consent record {ConsentRecordId}: {Reason}",
                consentRecord.Id,
                creation.FailureReason);

            // The upstream reason is logged but never returned: it names the account
            // and would let a caller probe which usernames exist.
            return Result<RegistrationResponse>.Failure(Error.Conflict(
                ErrorCodes.RegistrationFailed,
                "Registrasie kon nie voltooi word nie. Probeer asseblief 'n ander gebruikersnaam."));
        }

        consentRecord.SkaaphondUserId = creation.UserId;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<RegistrationResponse>.Success(new RegistrationResponse(
            request.UserName,
            request.Email,
            consentRecord.ConsentedAt));
    }

    private const int UserAgentMaxLength = 512;

    private static string? Truncate(string? value, int maxLength) =>
        value is null || value.Length <= maxLength ? value : value[..maxLength];
}
