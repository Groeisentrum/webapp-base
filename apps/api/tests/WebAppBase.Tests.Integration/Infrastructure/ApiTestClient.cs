using System.Net.Http.Json;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Models.Requests;

namespace WebAppBase.Tests.Integration.Infrastructure;

/// <summary>
/// Builds HTTP clients bound to a role, plus the seeding helpers most tests need.
/// </summary>
public static class ApiTestClient
{
    public static HttpClient AsAdmin(this WebAppApiFactory factory) => factory.WithRoles(Roles.Admin);

    public static HttpClient AsContentEditor(this WebAppApiFactory factory) => factory.WithRoles(Roles.Content);

    public static HttpClient AsAnonymous(this WebAppApiFactory factory) => factory.CreateClient();

    public static HttpClient WithRoles(this WebAppApiFactory factory, params string[] roles)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.RolesHeaderName, string.Join(',', roles));

        return client;
    }

    /// <summary>
    /// Creates the tenant settings row. Most endpoints need it, since language
    /// resolution and translation validation both read from it.
    /// </summary>
    public static async Task SeedTenantSettingsAsync(
        this WebAppApiFactory factory,
        params string[] activeLanguages)
    {
        var languages = activeLanguages.Length == 0 ? ["af", "en"] : activeLanguages;

        using var adminClient = factory.AsAdmin();

        var response = await adminClient.PutAsJsonAsync("/api/tenant-settings", new UpdateTenantSettingsRequest
        {
            SiteName = "Toetswerf",
            DefaultLanguageCode = languages[0],
            ActiveLanguageCodes = languages
        });

        response.EnsureSuccessStatusCode();
    }
}
