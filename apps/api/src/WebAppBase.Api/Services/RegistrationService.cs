using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebAppBase.Api.Configuration;
using WebAppBase.Api.Data;
using WebAppBase.Api.Domain;
using WebAppBase.Api.Domain.Entities;
using WebAppBase.Api.Domain.Results;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Api.Repositories;

namespace WebAppBase.Api.Services;

/// <summary>
/// Registers site visitors, in two steps.
/// </summary>
/// <remarks>
/// The address is verified <em>before</em> the account is created, so no account ever
/// exists for an unproven address and there is no half-registered state to clean up.
/// It also makes SkaapHond's hardcoded <c>EmailConfirmed = true</c> accurate rather
/// than an assumption.
///
/// Consent is written at the first step, so an account can never exist without evidence
/// behind it. An abandoned registration leaves an unlinked record, retained as a trail
/// of the attempt.
/// </remarks>
public sealed class RegistrationService(
    WebAppDbContext dbContext,
    ITenantSettingsRepository tenantSettingsRepository,
    ISkaaphondUserClient skaaphondUserClient,
    ISkaaphondOtpClient skaaphondOtpClient,
    IOptions<SkaaphondOptions> skaaphondOptions,
    IUnitOfWork unitOfWork,
    IClock clock,
    ILogger<RegistrationService> logger)
{
    private const int UserAgentMaxLength = 512;

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

    /// <summary>
    /// Records consent and sends a verification code. Creates no account.
    /// </summary>
    public async Task<Result<RegistrationStartedResponse>> StartAsync(
        RegisterClientRequest request,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken)
    {
        var settingsResult = await ValidateRequestAsync(request, cancellationToken);
        if (settingsResult.IsFailure)
        {
            return Result<RegistrationStartedResponse>.Failure(settingsResult.Error!);
        }

        var settings = settingsResult.Value;

        var otpResult = await skaaphondOtpClient.SendAsync(request.Email, cancellationToken);
        if (!otpResult.Succeeded)
        {
            return Result<RegistrationStartedResponse>.Failure(MapSendFailure(otpResult));
        }

        var consentRecord = new ConsentRecord
        {
            Email = request.Email,
            UserName = request.UserName,
            PrivacyPolicyVersion = settings.PrivacyPolicyVersion,
            TermsVersion = settings.TermsVersion,
            ConsentedAt = clock.UtcNow,
            IpAddress = ipAddress,
            UserAgent = Truncate(userAgent, UserAgentMaxLength),
            OtpPendingId = otpResult.PendingId
        };

        dbContext.ConsentRecords.Add(consentRecord);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<RegistrationStartedResponse>.Success(new RegistrationStartedResponse(
            otpResult.PendingId!,
            otpResult.ExpiresAt ?? clock.UtcNow,
            otpResult.RecipientMasked));
    }

    /// <summary>
    /// Verifies the code and, only then, creates the account.
    /// </summary>
    public async Task<Result<RegistrationResponse>> CompleteAsync(
        CompleteRegistrationRequest request,
        CancellationToken cancellationToken)
    {
        // Password is checked again here: the first step validated a value this request
        // does not carry, so nothing guarantees they match.
        if (!PasswordPolicy.IsSatisfiedBy(request.Password))
        {
            return Result<RegistrationResponse>.Failure(Error.Validation(
                ErrorCodes.PasswordTooWeak,
                PasswordPolicy.RequirementsMessage));
        }

        var consentRecord = await dbContext.ConsentRecords
            .FirstOrDefaultAsync(record => record.OtpPendingId == request.PendingId, cancellationToken);

        if (consentRecord is null)
        {
            return Result<RegistrationResponse>.Failure(VerificationNotFound());
        }

        // Guards a replayed completion. SkaapHond consumes the OTP on first use, so
        // this is belt-and-braces rather than the only defence.
        if (consentRecord.SkaaphondUserId is not null)
        {
            return Result<RegistrationResponse>.Failure(Error.Conflict(
                ErrorCodes.RegistrationAlreadyCompleted,
                "Hierdie registrasie is reeds voltooi. Teken asseblief in."));
        }

        var verification = await skaaphondOtpClient.VerifyAsync(
            request.PendingId,
            request.Code,
            cancellationToken);

        if (!verification.Verified)
        {
            return Result<RegistrationResponse>.Failure(MapVerifyFailure(verification));
        }

        consentRecord.EmailVerifiedAt = clock.UtcNow;

        // Identity comes from the stored record, never from this request — otherwise a
        // caller could verify one address and register under another.
        var creation = await skaaphondUserClient.CreateClientUserAsync(
            consentRecord.UserName,
            consentRecord.Email,
            request.Password,
            cancellationToken);

        if (!creation.Succeeded)
        {
            await unitOfWork.SaveChangesAsync(cancellationToken);

            logger.LogWarning(
                "Registration failed for consent record {ConsentRecordId}: {Reason}",
                consentRecord.Id,
                creation.FailureReason);

            // The upstream reason names the account and would allow username probing,
            // so it is logged but never returned.
            return Result<RegistrationResponse>.Failure(Error.Conflict(
                ErrorCodes.RegistrationFailed,
                "Registrasie kon nie voltooi word nie. Kontroleer jou besonderhede en probeer weer."));
        }

        consentRecord.SkaaphondUserId = creation.UserId;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<RegistrationResponse>.Success(new RegistrationResponse(
            consentRecord.UserName,
            consentRecord.Email,
            consentRecord.ConsentedAt));
    }

    /// <summary>Issues a fresh code for a verification already under way.</summary>
    public async Task<Result<RegistrationStartedResponse>> ResendCodeAsync(
        ResendRegistrationCodeRequest request,
        CancellationToken cancellationToken)
    {
        var consentRecord = await dbContext.ConsentRecords
            .FirstOrDefaultAsync(record => record.OtpPendingId == request.PendingId, cancellationToken);

        if (consentRecord is null || consentRecord.SkaaphondUserId is not null)
        {
            return Result<RegistrationStartedResponse>.Failure(VerificationNotFound());
        }

        var otpResult = await skaaphondOtpClient.ResendAsync(request.PendingId, cancellationToken);
        if (!otpResult.Succeeded)
        {
            return Result<RegistrationStartedResponse>.Failure(MapSendFailure(otpResult));
        }

        // SkaapHond issues a new pendingId and invalidates the old one, so the record
        // has to follow or completion would look up a handle that no longer exists.
        consentRecord.OtpPendingId = otpResult.PendingId;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<RegistrationStartedResponse>.Success(new RegistrationStartedResponse(
            otpResult.PendingId!,
            otpResult.ExpiresAt ?? clock.UtcNow,
            otpResult.RecipientMasked));
    }

    private async Task<Result<TenantSettings>> ValidateRequestAsync(
        RegisterClientRequest request,
        CancellationToken cancellationToken)
    {
        if (!request.ConsentToPrivacyPolicy || !request.AcceptTerms)
        {
            return Result<TenantSettings>.Failure(Error.Validation(
                ErrorCodes.ConsentRequired,
                "Jy moet die privaatheidsbeleid en bepalings aanvaar om te registreer."));
        }

        // Checked here rather than left to SkaapHond, so the caller is told which rule
        // they broke instead of receiving a generic upstream rejection.
        if (!PasswordPolicy.IsSatisfiedBy(request.Password))
        {
            return Result<TenantSettings>.Failure(Error.Validation(
                ErrorCodes.PasswordTooWeak,
                PasswordPolicy.RequirementsMessage));
        }

        var settings = await tenantSettingsRepository.GetAsync(cancellationToken);
        if (settings is null || !settings.SelfRegistrationEnabled)
        {
            return Result<TenantSettings>.Failure(RegistrationUnavailable());
        }

        // Without a role id the account would carry no role and could reach nothing, so
        // creating it would strand a real person.
        if (skaaphondOptions.Value.ClientRoleId <= 0)
        {
            logger.LogError("Self-registration is enabled but Skaaphond:ClientRoleId is not configured.");

            return Result<TenantSettings>.Failure(RegistrationUnavailable());
        }

        return Result<TenantSettings>.Success(settings);
    }

    private Error MapSendFailure(OtpSendOutcome outcome)
    {
        if (outcome.Failure == OtpFailure.NotSupported)
        {
            // Most likely the registration purpose is not yet admitted to SkaapHond's
            // contact-bound path, so it searched for a user row that cannot exist yet.
            logger.LogError(
                "SkaapHond refused the registration OTP purpose. Confirm '{Purpose}' is on its "
                + "contact-bound path. Detail: {Detail}",
                Domain.Constants.OtpPurposes.Registration,
                outcome.FailureDetail);
        }

        return outcome.Failure switch
        {
            OtpFailure.CooldownActive => Error.Conflict(
                ErrorCodes.VerificationCooldown,
                "'n Kode is onlangs gestuur. Wag asseblief 'n oomblik voordat jy weer probeer."),
            OtpFailure.NotSupported => RegistrationUnavailable(),
            _ => Error.Conflict(
                ErrorCodes.VerificationUnavailable,
                "Die verifikasiekode kon nie gestuur word nie. Probeer asseblief weer."),
        };
    }

    private static Error MapVerifyFailure(OtpVerifyOutcome outcome) => outcome.Failure switch
    {
        OtpFailure.Expired => Error.Validation(
            ErrorCodes.VerificationExpired,
            "Hierdie kode het verval. Vra asseblief 'n nuwe een aan."),
        OtpFailure.Unavailable => Error.Conflict(
            ErrorCodes.VerificationUnavailable,
            "Verifikasie is tans nie beskikbaar nie. Probeer asseblief weer."),
        _ => Error.Validation(
            ErrorCodes.VerificationCodeIncorrect,
            outcome.AttemptsRemaining is > 0
                ? $"Die kode is verkeerd. Jy het nog {outcome.AttemptsRemaining} pogings oor."
                : "Die kode is verkeerd of het verval. Vra asseblief 'n nuwe een aan."),
    };

    private static Error RegistrationUnavailable() => Error.Validation(
        ErrorCodes.RegistrationDisabled,
        "Registrasie is nie vir hierdie werf beskikbaar nie.");

    private static Error VerificationNotFound() => Error.NotFound(
        ErrorCodes.VerificationNotFound,
        "Hierdie registrasie kon nie gevind word nie. Begin asseblief oor.");

    private static string? Truncate(string? value, int maxLength) =>
        value is null || value.Length <= maxLength ? value : value[..maxLength];
}
