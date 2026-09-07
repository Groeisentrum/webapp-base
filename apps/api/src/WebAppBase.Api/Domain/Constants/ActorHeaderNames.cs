namespace WebAppBase.Api.Domain.Constants;

/// <summary>
/// Headers the Next.js proxy attaches after decoding the SkaapHond JWT server-side.
/// They are used for audit attribution only — authorisation is decided from the
/// validated token, never from these headers.
/// </summary>
public static class ActorHeaderNames
{
    public const string UserId = "X-Actor-User-Id";
    public const string Email = "X-Actor-Email";
    public const string Name = "X-Actor-Name";
}
