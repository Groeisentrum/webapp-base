namespace WebAppBase.Api.Services;

/// <summary>
/// Drives SkaapHond's one-time-password endpoints for email verification.
/// </summary>
/// <remarks>
/// Registration verifies the address <em>before</em> the account exists, which means
/// the OTP has no user row to attach to. SkaapHond supports that only for purposes on
/// its contact-bound path — see <c>OtpPurposes.Registration</c> on this side and the
/// matching constant that must exist in SkaapHond.
/// </remarks>
public interface ISkaaphondOtpClient
{
    Task<OtpSendOutcome> SendAsync(string email, CancellationToken cancellationToken);

    Task<OtpSendOutcome> ResendAsync(string pendingId, CancellationToken cancellationToken);

    Task<OtpVerifyOutcome> VerifyAsync(string pendingId, string code, CancellationToken cancellationToken);
}

/// <param name="RecipientMasked">
/// SkaapHond's redacted form of the address, safe to show back to the caller so they
/// can tell which inbox to check without the value being echoed in full.
/// </param>
public sealed record OtpSendOutcome(
    bool Succeeded,
    string? PendingId,
    DateTimeOffset? ExpiresAt,
    string? RecipientMasked,
    OtpFailure Failure,
    string? FailureDetail)
{
    public static OtpSendOutcome Success(string pendingId, DateTimeOffset expiresAt, string? recipientMasked) =>
        new(true, pendingId, expiresAt, recipientMasked, OtpFailure.None, null);

    public static OtpSendOutcome Failed(OtpFailure failure, string? detail) =>
        new(false, null, null, null, failure, detail);
}

public sealed record OtpVerifyOutcome(bool Verified, int? AttemptsRemaining, OtpFailure Failure, string? FailureDetail)
{
    public static OtpVerifyOutcome Success() => new(true, null, OtpFailure.None, null);

    public static OtpVerifyOutcome Rejected(int? attemptsRemaining) =>
        new(false, attemptsRemaining, OtpFailure.IncorrectCode, null);

    public static OtpVerifyOutcome Failed(OtpFailure failure, string? detail) =>
        new(false, null, failure, detail);
}

public enum OtpFailure
{
    None = 0,

    /// <summary>SkaapHond rejected the code, or its attempt allowance ran out.</summary>
    IncorrectCode = 1,

    /// <summary>The pending verification expired or was already consumed.</summary>
    Expired = 2,

    /// <summary>A resend was requested inside SkaapHond's cooldown window.</summary>
    CooldownActive = 3,

    /// <summary>
    /// SkaapHond refused the purpose or the caller. Most likely the registration
    /// purpose is not yet on its contact-bound path, so it looked for a user row that
    /// does not exist.
    /// </summary>
    NotSupported = 4,

    Unavailable = 5
}
