namespace WebAppBase.Api.Domain.Constants;

/// <summary>
/// OTP purposes this app asks SkaapHond for.
/// </summary>
public static class OtpPurposes
{
    /// <summary>
    /// Verifies an email address during self-registration.
    /// </summary>
    /// <remarks>
    /// The account does not exist yet, so the OTP row carries no user id. SkaapHond
    /// permits that only on its contact-bound path, which is gated on a fixed set of
    /// purposes — this value must be added to <c>OtpPurposes</c> there and admitted to
    /// that branch, or the send returns "user not found".
    ///
    /// Do not substitute <c>signing-ceremony</c> to avoid that change: purposes scope
    /// resend invalidation, so reusing one conflates two intents and muddies any audit
    /// of OTP rows.
    /// </remarks>
    public const string Registration = "registration";
}

/// <summary>Delivery channels, matching SkaapHond's persisted numeric values.</summary>
public static class OtpDeliveryChannels
{
    public const int Sms = 1;
    public const int Email = 2;
}
