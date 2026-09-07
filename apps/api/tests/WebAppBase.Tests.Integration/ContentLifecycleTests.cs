using System.Net;
using System.Net.Http.Json;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Tests.Integration.Infrastructure;

namespace WebAppBase.Tests.Integration;

/// <summary>
/// Walks content from creation through publication to public visibility.
/// </summary>
public sealed class ContentLifecycleTests : IClassFixture<WebAppApiFactory>
{
    private readonly WebAppApiFactory factory;

    public ContentLifecycleTests(WebAppApiFactory factory) => this.factory = factory;

    [Fact]
    public async Task DraftContent_IsInvisibleToVisitorsButVisibleToEditors()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("konsep-afdeling");

        using var editorClient = factory.AsContentEditor();
        var created = await CreateContentAsync(editorClient, categoryId, "Ongepubliseerde artikel", publishedAt: null);

        var editorListing = await editorClient.GetFromJsonAsync<PagedResponse<ContentResponse>>("/api/content");
        editorListing!.Items.Should().Contain(item => item.Id == created.Id);

        using var visitorClient = factory.AsAnonymous();
        var publicListing = await visitorClient.GetFromJsonAsync<PagedResponse<PublicContentResponse>>(
            "/api/public/content");

        publicListing!.Items.Should().NotContain(item => item.Id == created.Id);
    }

    [Fact]
    public async Task DraftContent_ByDirectId_ReportsNotFoundRatherThanForbidden()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("verborge-afdeling");

        using var editorClient = factory.AsContentEditor();
        var created = await CreateContentAsync(editorClient, categoryId, "Geheime konsep", publishedAt: null);

        using var visitorClient = factory.AsAnonymous();
        var response = await visitorClient.GetAsync($"/api/public/content/{created.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PublishedContent_AppearsOnThePublicSurface()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("gepubliseerde-afdeling");

        using var editorClient = factory.AsContentEditor();
        var created = await CreateContentAsync(
            editorClient,
            categoryId,
            "Gepubliseerde artikel",
            publishedAt: DateTimeOffset.UtcNow.AddMinutes(-5));

        using var visitorClient = factory.AsAnonymous();
        var response = await visitorClient.GetFromJsonAsync<PublicContentResponse>(
            $"/api/public/content/{created.Id}");

        response!.Title.Should().Be("Gepubliseerde artikel");
    }

    [Fact]
    public async Task ExpiredContent_DropsOffThePublicSurface()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("verstreke-afdeling");

        using var editorClient = factory.AsContentEditor();
        var created = await CreateContentAsync(
            editorClient,
            categoryId,
            "Verstreke artikel",
            publishedAt: DateTimeOffset.UtcNow.AddDays(-10),
            unpublishedAt: DateTimeOffset.UtcNow.AddDays(-1));

        using var visitorClient = factory.AsAnonymous();
        var response = await visitorClient.GetAsync($"/api/public/content/{created.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    /// <summary>
    /// A past event inside a live publish window must stay visible — the windows are
    /// independent, so an event being over does not retract its page.
    /// </summary>
    [Fact]
    public async Task PastEvent_RemainsVisibleWhileStillPublished()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("geleenthede-afdeling");

        using var editorClient = factory.AsContentEditor();

        var response = await editorClient.PostAsJsonAsync("/api/content", new CreateContentRequest
        {
            CategoryId = categoryId,
            Title = "Verlede geleentheid",
            AssetType = AssetType.YouTube,
            AssetReference = "abc123",
            PublishedAt = DateTimeOffset.UtcNow.AddDays(-30),
            EventStart = DateTimeOffset.UtcNow.AddDays(-10),
            EventEnd = DateTimeOffset.UtcNow.AddDays(-10).AddHours(3)
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = (await response.Content.ReadFromJsonAsync<ContentResponse>())!;

        using var visitorClient = factory.AsAnonymous();
        var publicResponse = await visitorClient.GetAsync($"/api/public/content/{created.Id}");

        publicResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task InvalidPublishWindow_IsRejected()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("ongeldige-afdeling");

        using var editorClient = factory.AsContentEditor();

        var response = await editorClient.PostAsJsonAsync("/api/content", new CreateContentRequest
        {
            CategoryId = categoryId,
            Title = "Ongeldige venster",
            PublishedAt = DateTimeOffset.UtcNow,
            UnpublishedAt = DateTimeOffset.UtcNow.AddDays(-1)
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task DeletedContent_DisappearsFromBothSurfaces()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("geskrapte-afdeling");

        using var editorClient = factory.AsContentEditor();
        var created = await CreateContentAsync(
            editorClient,
            categoryId,
            "Om te skrap",
            publishedAt: DateTimeOffset.UtcNow.AddMinutes(-5));

        var deleteResponse = await editorClient.DeleteAsync($"/api/content/{created.Id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var editorResponse = await editorClient.GetAsync($"/api/content/{created.Id}");
        editorResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);

        using var visitorClient = factory.AsAnonymous();
        var publicResponse = await visitorClient.GetAsync($"/api/public/content/{created.Id}");
        publicResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private async Task<long> CreateCategoryAsync(string slug)
    {
        using var adminClient = factory.AsAdmin();

        var response = await adminClient.PostAsJsonAsync("/api/categories", new CreateCategoryRequest
        {
            Name = slug,
            Slug = slug
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var category = await response.Content.ReadFromJsonAsync<CategoryResponse>();

        return category!.Id;
    }

    private static async Task<ContentResponse> CreateContentAsync(
        HttpClient client,
        long categoryId,
        string title,
        DateTimeOffset? publishedAt,
        DateTimeOffset? unpublishedAt = null)
    {
        var response = await client.PostAsJsonAsync("/api/content", new CreateContentRequest
        {
            CategoryId = categoryId,
            Title = title,
            AssetType = AssetType.YouTube,
            AssetReference = "abc123",
            PublishedAt = publishedAt,
            UnpublishedAt = unpublishedAt
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        return (await response.Content.ReadFromJsonAsync<ContentResponse>())!;
    }
}
