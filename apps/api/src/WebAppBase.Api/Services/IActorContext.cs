namespace WebAppBase.Api.Services;

/// <summary>
/// Identity of the caller responsible for the current request, used for audit attribution.
/// </summary>
/// <remarks>
/// Authorisation is decided from the validated JWT, never from this type. The
/// proxy-supplied actor headers are attribution hints only, so a forged header can
/// misattribute an audit row but cannot grant access.
/// </remarks>
public interface IActorContext
{
    string? UserId { get; }

    string? Email { get; }

    string? Name { get; }
}
