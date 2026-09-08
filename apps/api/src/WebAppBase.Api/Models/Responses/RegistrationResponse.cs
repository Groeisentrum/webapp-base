namespace WebAppBase.Api.Models.Responses;

/// <summary>
/// Outcome of a self-registration. Carries no token — the client signs in afterwards
/// through the normal login route, so registration never mints a session.
/// </summary>
public sealed record RegistrationResponse(string UserName, string Email, DateTimeOffset ConsentedAt);

/// <summary>
/// Whether the public site should offer a registration link at all.
/// </summary>
public sealed record RegistrationAvailabilityResponse(bool SelfRegistrationEnabled);
