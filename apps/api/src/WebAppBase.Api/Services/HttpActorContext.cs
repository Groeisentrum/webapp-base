using System.Security.Claims;
using WebAppBase.Api.Domain.Constants;

namespace WebAppBase.Api.Services;

/// <summary>
/// Resolves the acting user from the validated token first, falling back to the
/// proxy's actor headers when a claim is absent.
/// </summary>
public sealed class HttpActorContext(IHttpContextAccessor httpContextAccessor) : IActorContext
{
    public string? UserId => ClaimValue(ClaimTypes.NameIdentifier, ClaimNames.Subject, ClaimNames.NameIdentifier)
        ?? HeaderValue(ActorHeaderNames.UserId);

    public string? Email => ClaimValue(ClaimTypes.Email, ClaimNames.Email, ClaimNames.UserPrincipalName, ClaimNames.UniqueName)
        ?? HeaderValue(ActorHeaderNames.Email);

    public string? Name => ClaimValue(ClaimTypes.Name, ClaimNames.Name)
        ?? HeaderValue(ActorHeaderNames.Name);

    private string? ClaimValue(params string[] claimTypes)
    {
        var user = httpContextAccessor.HttpContext?.User;
        if (user is null)
        {
            return null;
        }

        foreach (var claimType in claimTypes)
        {
            var value = user.FindFirstValue(claimType);
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return null;
    }

    private string? HeaderValue(string headerName)
    {
        var headers = httpContextAccessor.HttpContext?.Request.Headers;
        if (headers is null || !headers.TryGetValue(headerName, out var values))
        {
            return null;
        }

        var value = values.ToString();
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }
}
