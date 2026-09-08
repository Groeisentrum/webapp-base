using System.Security.Claims;
using WebAppBase.Api.Domain.ValueObjects;

namespace WebAppBase.Api.Services;

/// <summary>
/// Resolves who is viewing the public surface.
/// </summary>
public interface IViewerContext
{
    Viewer Current { get; }
}

/// <summary>
/// Builds the viewer from the validated token when one was supplied.
/// </summary>
/// <remarks>
/// The public endpoints allow anonymous access, but authentication still runs ahead of
/// them — so a caller who presents a valid token is recognised here, while one who
/// presents none, or an invalid one, is simply anonymous. Roles come from the verified
/// principal, never from a header.
/// </remarks>
public sealed class HttpViewerContext(IHttpContextAccessor httpContextAccessor) : IViewerContext
{
    public Viewer Current
    {
        get
        {
            var user = httpContextAccessor.HttpContext?.User;

            if (user?.Identity is null || !user.Identity.IsAuthenticated)
            {
                return Viewer.Anonymous;
            }

            var roles = user.FindAll(ClaimTypes.Role).Select(claim => claim.Value);

            return new Viewer(true, roles);
        }
    }
}
