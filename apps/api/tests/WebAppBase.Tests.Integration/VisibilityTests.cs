using System.Net;
using System.Net.Http.Json;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Tests.Integration.Infrastructure;

namespace WebAppBase.Tests.Integration;

/// <summary>
/// Proves visibility is enforced server-side, not merely omitted from navigation.
/// </summary>
/// <remarks>
/// The direct-URL cases matter most: on this template URLs travel via NFC tags and QR
/// codes, so "hidden from the menu" is worth nothing on its own.
/// </remarks>
public sealed class VisibilityTests : IClassFixture<WebAppApiFactory>
{
    private readonly WebAppApiFactory factory;

    public VisibilityTests(WebAppApiFactory factory) => this.factory = factory;

    [Fact]
    public async Task SignInOnlyContent_IsUnreachableByDirectUrlWhenAnonymous()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("lede-afdeling", Visibility.Public);
        var contentId = await CreatePublishedContentAsync(categoryId, "Slegs vir lede", Visibility.Authenticated);

        using var anonymous = factory.AsAnonymous();
        var response = await anonymous.GetAsync($"/api/public/content/{contentId}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SignInOnlyContent_IsReachableOnceSignedIn()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("lede-afdeling-2", Visibility.Public);
        var contentId = await CreatePublishedContentAsync(categoryId, "Lede-inhoud", Visibility.Authenticated);

        using var client = factory.WithRoles(Roles.Client);
        var response = await client.GetFromJsonAsync<PublicContentResponse>(
            $"/api/public/content/{contentId}");

        response!.Title.Should().Be("Lede-inhoud");
    }

    [Fact]
    public async Task SignInOnlyContent_IsAbsentFromAnonymousListings()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("lys-afdeling", Visibility.Public);
        var contentId = await CreatePublishedContentAsync(categoryId, "Verborge in lys", Visibility.Authenticated);

        using var anonymous = factory.AsAnonymous();
        var listing = await anonymous.GetFromJsonAsync<PagedResponse<PublicContentResponse>>(
            "/api/public/content");

        listing!.Items.Should().NotContain(item => item.Id == contentId);
    }

    [Fact]
    public async Task RestrictedContent_IsHiddenFromASignedInUserWithoutTheRole()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("rol-afdeling", Visibility.Public);
        var contentId = await CreatePublishedContentAsync(
            categoryId,
            "Slegs kliënte",
            Visibility.Restricted,
            [Roles.Client]);

        using var wrongRole = factory.WithRoles(Roles.Content);
        var response = await wrongRole.GetAsync($"/api/public/content/{contentId}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task RestrictedContent_IsVisibleToTheListedRole()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("rol-afdeling-2", Visibility.Public);
        var contentId = await CreatePublishedContentAsync(
            categoryId,
            "Kliënt-inhoud",
            Visibility.Restricted,
            [Roles.Client]);

        using var client = factory.WithRoles(Roles.Client);
        var response = await client.GetAsync($"/api/public/content/{contentId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    /// <summary>
    /// The inheritance rule: an item marked public inside a restricted section must
    /// still be hidden, or the section's restriction means nothing.
    /// </summary>
    [Fact]
    public async Task PublicContent_InARestrictedCategory_IsStillHidden()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("geslote-afdeling", Visibility.Authenticated);
        var contentId = await CreatePublishedContentAsync(categoryId, "Publieke item", Visibility.Public);

        using var anonymous = factory.AsAnonymous();
        var response = await anonymous.GetAsync($"/api/public/content/{contentId}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task RestrictedCategory_IsAbsentFromTheAnonymousCategoryTree()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("verborge-afdeling", Visibility.Authenticated);

        using var anonymous = factory.AsAnonymous();
        var tree = await anonymous.GetFromJsonAsync<IReadOnlyList<CategoryTreeNodeResponse>>(
            "/api/public/categories");

        tree!.Should().NotContain(node => node.Id == categoryId);
    }

    [Fact]
    public async Task RestrictedCategory_AppearsOnceSignedIn()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("sigbare-afdeling", Visibility.Authenticated);

        using var client = factory.WithRoles(Roles.Client);
        var tree = await client.GetFromJsonAsync<IReadOnlyList<CategoryTreeNodeResponse>>(
            "/api/public/categories");

        tree!.Should().Contain(node => node.Id == categoryId);
    }

    /// <summary>
    /// A visible menu entry pointing at a hidden category would send the reader to a
    /// page that returns nothing, so the entry is dropped with its target.
    /// </summary>
    [Fact]
    public async Task MenuItem_PointingAtAHiddenCategory_IsDropped()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("kieslys-afdeling", Visibility.Authenticated);

        using var editor = factory.AsContentEditor();
        var created = await editor.PostAsJsonAsync("/api/menu-items", new CreateMenuItemRequest
        {
            MenuType = MenuType.Top,
            LinkType = MenuLinkType.Category,
            Label = "Lede-afdeling",
            CategoryId = categoryId,
            Visibility = Visibility.Public,
        });
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var menuItem = (await created.Content.ReadFromJsonAsync<MenuItemResponse>())!;

        using var anonymous = factory.AsAnonymous();
        var menu = await anonymous.GetFromJsonAsync<IReadOnlyList<MenuItemResponse>>(
            "/api/public/menu-items");

        menu!.Should().NotContain(item => item.Id == menuItem.Id);
    }

    [Fact]
    public async Task ContentInAHiddenCategory_IsAbsentEvenWhenThatCategoryIsRequested()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("gefiltreerde-afdeling", Visibility.Authenticated);
        await CreatePublishedContentAsync(categoryId, "Onsigbaar", Visibility.Public);

        using var anonymous = factory.AsAnonymous();
        var listing = await anonymous.GetFromJsonAsync<PagedResponse<PublicContentResponse>>(
            $"/api/public/content?categoryId={categoryId}");

        listing!.Items.Should().BeEmpty();
        listing.TotalCount.Should().Be(0);
    }

    private async Task<long> CreateCategoryAsync(
        string slug,
        Visibility visibility,
        IReadOnlyList<string>? visibleToRoles = null)
    {
        using var adminClient = factory.AsAdmin();

        var response = await adminClient.PostAsJsonAsync("/api/categories", new CreateCategoryRequest
        {
            Name = slug,
            Slug = slug,
            Visibility = visibility,
            VisibleToRoles = visibleToRoles ?? [],
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var category = (await response.Content.ReadFromJsonAsync<CategoryResponse>())!;

        return category.Id;
    }

    private async Task<long> CreatePublishedContentAsync(
        long categoryId,
        string title,
        Visibility visibility,
        IReadOnlyList<string>? visibleToRoles = null)
    {
        using var editorClient = factory.AsContentEditor();

        var response = await editorClient.PostAsJsonAsync("/api/content", new CreateContentRequest
        {
            CategoryId = categoryId,
            Title = title,
            PublishedAt = DateTimeOffset.UtcNow.AddMinutes(-5),
            Visibility = visibility,
            VisibleToRoles = visibleToRoles ?? [],
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var content = (await response.Content.ReadFromJsonAsync<ContentResponse>())!;

        return content.Id;
    }
}
