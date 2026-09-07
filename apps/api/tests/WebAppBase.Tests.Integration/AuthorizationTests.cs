using System.Net;
using System.Net.Http.Json;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Tests.Integration.Infrastructure;

namespace WebAppBase.Tests.Integration;

/// <summary>
/// Pins the role split: Admin owns site configuration, Content owns content, and
/// anonymous callers reach only the public surface.
/// </summary>
public sealed class AuthorizationTests : IClassFixture<WebAppApiFactory>
{
    private readonly WebAppApiFactory factory;

    public AuthorizationTests(WebAppApiFactory factory) => this.factory = factory;

    [Theory]
    [InlineData("/api/tenant-settings")]
    [InlineData("/api/categories")]
    [InlineData("/api/audit-logs")]
    [InlineData("/api/content")]
    [InlineData("/api/menu-items")]
    public async Task AdminEndpoints_RejectAnonymousCallers(string path)
    {
        using var client = factory.AsAnonymous();

        var response = await client.GetAsync(path);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("/api/tenant-settings")]
    [InlineData("/api/categories")]
    [InlineData("/api/audit-logs")]
    public async Task ConfigurationEndpoints_RejectTheContentRole(string path)
    {
        using var client = factory.AsContentEditor();

        var response = await client.GetAsync(path);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task ContentRole_CannotChangeTenantSettings()
    {
        using var client = factory.AsContentEditor();

        var response = await client.PutAsJsonAsync("/api/tenant-settings", new UpdateTenantSettingsRequest
        {
            SiteName = "Gekaap",
            DefaultLanguageCode = "af",
            ActiveLanguageCodes = ["af"]
        });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Theory]
    [InlineData("/api/content")]
    [InlineData("/api/menu-items")]
    public async Task ContentEndpoints_AcceptTheContentRole(string path)
    {
        using var client = factory.AsContentEditor();

        var response = await client.GetAsync(path);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task AdminRole_AlsoReachesContentEndpoints()
    {
        using var client = factory.AsAdmin();

        var response = await client.GetAsync("/api/content");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Theory]
    [InlineData("/api/public/categories")]
    [InlineData("/api/public/content")]
    [InlineData("/api/public/menu-items")]
    [InlineData("/health")]
    public async Task PublicSurface_IsReachableAnonymously(string path)
    {
        await factory.SeedTenantSettingsAsync();
        using var client = factory.AsAnonymous();

        var response = await client.GetAsync(path);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
