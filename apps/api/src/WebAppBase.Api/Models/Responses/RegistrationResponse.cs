namespace WebAppBase.Api.Models.Responses;

/// <summary>
/// Outcome of the first registration step. A code has been sent; no account exists yet.
/// </summary>
/// <param name="RecipientMasked">
/// SkaapHond's redacted form of the address, so the caller can tell which inbox to
/// check without the full value being echoed back.
/// </param>
public sealed record RegistrationStartedResponse(
    string PendingId,
    DateTimeOffset ExpiresAt,
    string? RecipientMasked);

/// <summary>
/// Outcome of a completed registration. Carries no token — the client signs in
/// afterwards through the normal login route, so registration never mints a session.
/// </summary>
public sealed record RegistrationResponse(string UserName, string Email, DateTimeOffset ConsentedAt);

/// <summary>
/// Whether the public site should offer a registration link at all.
/// </summary>
public sealed record RegistrationAvailabilityResponse(bool SelfRegistrationEnabled);
