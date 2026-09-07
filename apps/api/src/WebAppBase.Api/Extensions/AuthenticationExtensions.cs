using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using WebAppBase.Api.Configuration;
using WebAppBase.Api.Domain.Constants;

namespace WebAppBase.Api.Extensions;

/// <summary>
/// Wires validation of SkaapHond-issued tokens.
/// </summary>
public static class AuthenticationExtensions
{
    public static IServiceCollection AddWebAppAuthentication(
        this IServiceCollection services,
        SkaaphondOptions skaaphondOptions)
    {
        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.MapInboundClaims = false;
                options.TokenValidationParameters = BuildValidationParameters(skaaphondOptions);
                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = context =>
                    {
                        NormaliseRoleClaims(context.Principal);
                        return Task.CompletedTask;
                    }
                };
            });

        services.AddAuthorizationBuilder()
            .AddPolicy(PolicyNames.AdminOnly, policy => policy.RequireRole(Roles.Admin))
            .AddPolicy(PolicyNames.ContentManagement, policy => policy.RequireRole(Roles.Admin, Roles.Content));

        return services;
    }

    private static TokenValidationParameters BuildValidationParameters(SkaaphondOptions skaaphondOptions)
    {
        var parameters = new TokenValidationParameters
        {
            RoleClaimType = ClaimTypes.Role,
            NameClaimType = ClaimNames.Name,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(skaaphondOptions.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };

        // Issuer/audience are only checked when configured, so a local dev token
        // signed with the dev key still works without mirroring production values.
        var hasIssuer = !string.IsNullOrWhiteSpace(skaaphondOptions.Issuer);
        var hasAudience = !string.IsNullOrWhiteSpace(skaaphondOptions.Audience);

        parameters.ValidateIssuer = hasIssuer && !skaaphondOptions.AllowUnverifiedTokens;
        parameters.ValidateAudience = hasAudience && !skaaphondOptions.AllowUnverifiedTokens;

        if (parameters.ValidateIssuer)
        {
            parameters.ValidIssuer = skaaphondOptions.Issuer;
        }

        if (parameters.ValidateAudience)
        {
            parameters.ValidAudience = skaaphondOptions.Audience;
        }

        return parameters;
    }

    /// <summary>
    /// SkaapHond emits roles under several claim names depending on token version.
    /// Collapsing them to <see cref="ClaimTypes.Role"/> lets policies use RequireRole
    /// without every call site knowing which spelling arrived.
    /// </summary>
    private static void NormaliseRoleClaims(ClaimsPrincipal? principal)
    {
        if (principal?.Identity is not ClaimsIdentity identity)
        {
            return;
        }

        var roleValues = identity.Claims
            .Where(claim => claim.Type is ClaimNames.Role or ClaimNames.Roles or ClaimNames.RoleUri)
            .Select(claim => claim.Value)
            .SelectMany(SplitRoleValue)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        foreach (var roleValue in roleValues)
        {
            if (!identity.HasClaim(ClaimTypes.Role, roleValue))
            {
                identity.AddClaim(new Claim(ClaimTypes.Role, roleValue));
            }
        }
    }

    /// <summary>Handles roles arriving as a single claim holding a comma-separated list.</summary>
    private static IEnumerable<string> SplitRoleValue(string value) => value
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
