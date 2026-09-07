using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace WebAppBase.Tests.Integration.Infrastructure;

/// <summary>
/// Stands in for SkaapHond token validation so tests can exercise role gating
/// without minting real JWTs. Requests carrying no test-role header stay anonymous.
/// </summary>
public sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory loggerFactory,
    UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, loggerFactory, encoder)
{
    public const string SchemeName = "IntegrationTestScheme";
    public const string RolesHeaderName = "X-Test-Roles";
    public const string UserIdHeaderName = "X-Test-User-Id";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(RolesHeaderName, out var rolesHeader))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var roles = rolesHeader.ToString()
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        var userId = Request.Headers.TryGetValue(UserIdHeaderName, out var userIdHeader)
            ? userIdHeader.ToString()
            : "test-user";

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new(ClaimTypes.Email, $"{userId}@toets.local")
        };

        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var identity = new ClaimsIdentity(claims, SchemeName);
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
