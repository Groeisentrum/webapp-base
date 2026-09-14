using System.Net;
using System.Net.Http.Json;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Tests.Integration.Infrastructure;

namespace WebAppBase.Tests.Integration;

/// <summary>
/// Covers the point-of-interest feed the map and itinerary features consume.
/// </summary>
/// <remarks>
/// This is a published contract with two independent consumers, so the shape is
/// asserted here as well as the filtering. A pin leaking past the publish window or
/// past visibility is worse than a page doing the same: a pin is a physical place,
/// and the URL behind it travels on NFC tags and QR codes.
/// </remarks>
public sealed class PublicLocationsTests : IClassFixture<WebAppApiFactory>
{
    private const decimal MonumentLatitude = -25.776600m;
    private const decimal MonumentLongitude = 28.175300m;

    private readonly WebAppApiFactory factory;

    public PublicLocationsTests(WebAppApiFactory factory) => this.factory = factory;

    [Fact]
    public async Task PublishedLocation_IsReturnedWithItsCategoryAndPhoto()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("poi-geskiedenis", "#7b1f2b");
        var contentId = await CreatePublishedContentAsync(categoryId, "Voortrekkermonument", "Die hoofmonument.");
        var locationId = await CreateLocationAsync(contentId);

        using var anonymous = factory.AsAnonymous();
        var locations = await anonymous.GetFromJsonAsync<IReadOnlyList<PublicLocationResponse>>(
            "/api/public/locations");

        var location = locations!.Single(item => item.Id == locationId);

        location.ContentId.Should().Be(contentId);
        location.Name.Should().Be("Voortrekkermonument");
        location.ShortDescription.Should().Be("Die hoofmonument.");
        location.CategoryId.Should().Be(categoryId);
        location.CategorySlug.Should().Be("poi-geskiedenis");
        location.CategoryColour.Should().Be("#7b1f2b");
        location.PhotoReference.Should().Be("vtm/hoofmonument.jpg");
        location.Latitude.Should().Be(MonumentLatitude);
        location.Longitude.Should().Be(MonumentLongitude);
    }

    /// <summary>
    /// The three linkage ids exist so AR, NFC and tour features can attach to a pin
    /// later. They are null today, and the contract must keep carrying them.
    /// </summary>
    [Fact]
    public async Task FutureLinkageIds_AreCarriedAndDefaultToNull()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("poi-linkage", "#17a2a2");
        var contentId = await CreatePublishedContentAsync(categoryId, "Pioniersentrum", null);
        var locationId = await CreateLocationAsync(contentId);

        using var anonymous = factory.AsAnonymous();
        var locations = await anonymous.GetFromJsonAsync<IReadOnlyList<PublicLocationResponse>>(
            "/api/public/locations");

        var location = locations!.Single(item => item.Id == locationId);

        location.TourStopId.Should().BeNull();
        location.ArAnchorId.Should().BeNull();
        location.NfcTagId.Should().BeNull();
    }

    [Fact]
    public async Task LinkageIds_RoundTripWhenSet()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("poi-gekoppel", "#c62828");
        var contentId = await CreatePublishedContentAsync(categoryId, "Museumteater", null);
        var locationId = await CreateLocationAsync(contentId, tourStopId: 12, arAnchorId: 34, nfcTagId: 56);

        using var anonymous = factory.AsAnonymous();
        var locations = await anonymous.GetFromJsonAsync<IReadOnlyList<PublicLocationResponse>>(
            "/api/public/locations");

        var location = locations!.Single(item => item.Id == locationId);

        location.TourStopId.Should().Be(12);
        location.ArAnchorId.Should().Be(34);
        location.NfcTagId.Should().Be(56);
    }

    [Fact]
    public async Task UnpublishedLocation_IsAbsent()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("poi-konsep", "#222222");
        var contentId = await CreateDraftContentAsync(categoryId, "Nog nie oop nie");
        var locationId = await CreateLocationAsync(contentId);

        using var anonymous = factory.AsAnonymous();
        var locations = await anonymous.GetFromJsonAsync<IReadOnlyList<PublicLocationResponse>>(
            "/api/public/locations");

        locations!.Should().NotContain(item => item.Id == locationId);
    }

    [Fact]
    public async Task LocationInASignInOnlyCategory_IsHiddenFromAnonymousVisitors()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("poi-lede", "#6a3d9a", Visibility.Authenticated);
        var contentId = await CreatePublishedContentAsync(categoryId, "Ledesaal", null);
        var locationId = await CreateLocationAsync(contentId);

        using var anonymous = factory.AsAnonymous();
        var anonymousLocations = await anonymous.GetFromJsonAsync<IReadOnlyList<PublicLocationResponse>>(
            "/api/public/locations");

        anonymousLocations!.Should().NotContain(item => item.Id == locationId);

        using var signedIn = factory.WithRoles(Roles.Client);
        var signedInLocations = await signedIn.GetFromJsonAsync<IReadOnlyList<PublicLocationResponse>>(
            "/api/public/locations");

        signedInLocations!.Should().Contain(item => item.Id == locationId);
    }

    [Fact]
    public async Task Name_PrefersThePinLabelOverTheContentTitle()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("poi-etiket", "#d9731f");
        var contentId = await CreatePublishedContentAsync(categoryId, "Restaurant en koffiewinkel", null);
        var locationId = await CreateLocationAsync(contentId, label: "Koffiewinkel");

        using var anonymous = factory.AsAnonymous();
        var locations = await anonymous.GetFromJsonAsync<IReadOnlyList<PublicLocationResponse>>(
            "/api/public/locations");

        locations!.Single(item => item.Id == locationId).Name.Should().Be("Koffiewinkel");
    }

    [Fact]
    public async Task RequestedLanguage_ResolvesNameAndCategory()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("poi-vertaal", "#2e7d32");
        var contentId = await CreatePublishedContentAsync(categoryId, "Wandelroetes", "Roetes deur die reservaat.");
        var locationId = await CreateLocationAsync(contentId);

        await TranslateAsync(EntityTypeNames.Content, contentId, TranslatableFieldNames.Title, "Walking trails");
        await TranslateAsync(EntityTypeNames.Category, categoryId, TranslatableFieldNames.Name, "Sport and lifestyle");

        using var anonymous = factory.AsAnonymous();
        var locations = await anonymous.GetFromJsonAsync<IReadOnlyList<PublicLocationResponse>>(
            "/api/public/locations?language=en");

        var location = locations!.Single(item => item.Id == locationId);

        location.Name.Should().Be("Walking trails");
        location.CategoryName.Should().Be("Sport and lifestyle");
    }

    /// <summary>
    /// A missing translation degrades to the default language rather than to a gap —
    /// an unnamed pin on a map is worse than one named in the wrong language.
    /// </summary>
    [Fact]
    public async Task MissingTranslation_FallsBackToTheDefaultLanguage()
    {
        await factory.SeedTenantSettingsAsync();
        var categoryId = await CreateCategoryAsync("poi-onvertaal", "#e8b923");
        var contentId = await CreatePublishedContentAsync(categoryId, "Plaaswerf", null);
        var locationId = await CreateLocationAsync(contentId);

        using var anonymous = factory.AsAnonymous();
        var locations = await anonymous.GetFromJsonAsync<IReadOnlyList<PublicLocationResponse>>(
            "/api/public/locations?language=en");

        locations!.Single(item => item.Id == locationId).Name.Should().Be("Plaaswerf");
    }

    [Fact]
    public async Task CategoryFilter_ReturnsOnlyThatCategoryPins()
    {
        await factory.SeedTenantSettingsAsync();
        var wantedId = await CreateCategoryAsync("poi-gevra", "#1f4e8c");
        var otherId = await CreateCategoryAsync("poi-ander", "#f5f5f5");

        var wantedContentId = await CreatePublishedContentAsync(wantedId, "Uitkykdek", null);
        var wantedLocationId = await CreateLocationAsync(wantedContentId);

        var otherContentId = await CreatePublishedContentAsync(otherId, "Hoofparkering", null);
        var otherLocationId = await CreateLocationAsync(otherContentId);

        using var anonymous = factory.AsAnonymous();
        var locations = await anonymous.GetFromJsonAsync<IReadOnlyList<PublicLocationResponse>>(
            $"/api/public/locations?categoryId={wantedId}");

        locations!.Should().Contain(item => item.Id == wantedLocationId);
        locations.Should().NotContain(item => item.Id == otherLocationId);
    }

    [Fact]
    public async Task UnsupportedLanguage_IsRejected()
    {
        await factory.SeedTenantSettingsAsync("af", "en");

        using var anonymous = factory.AsAnonymous();
        var response = await anonymous.GetAsync("/api/public/locations?language=de");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    private async Task<long> CreateCategoryAsync(
        string slug,
        string colour,
        Visibility visibility = Visibility.Public)
    {
        using var adminClient = factory.AsAdmin();

        var response = await adminClient.PostAsJsonAsync("/api/categories", new CreateCategoryRequest
        {
            Name = slug,
            Slug = slug,
            Colour = colour,
            Visibility = visibility,
            VisibleToRoles = [],
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        return (await response.Content.ReadFromJsonAsync<CategoryResponse>())!.Id;
    }

    private async Task<long> CreatePublishedContentAsync(long categoryId, string title, string? description)
    {
        using var editorClient = factory.AsContentEditor();

        var response = await editorClient.PostAsJsonAsync("/api/content", new CreateContentRequest
        {
            CategoryId = categoryId,
            Title = title,
            Description = description,
            AssetType = AssetType.Image,
            AssetReference = "vtm/hoofmonument.jpg",
            PublishedAt = DateTimeOffset.UtcNow.AddMinutes(-5),
            Visibility = Visibility.Public,
            VisibleToRoles = [],
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        return (await response.Content.ReadFromJsonAsync<ContentResponse>())!.Id;
    }

    private async Task<long> CreateDraftContentAsync(long categoryId, string title)
    {
        using var editorClient = factory.AsContentEditor();

        var response = await editorClient.PostAsJsonAsync("/api/content", new CreateContentRequest
        {
            CategoryId = categoryId,
            Title = title,
            Visibility = Visibility.Public,
            VisibleToRoles = [],
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        return (await response.Content.ReadFromJsonAsync<ContentResponse>())!.Id;
    }

    private async Task<long> CreateLocationAsync(
        long contentId,
        string? label = null,
        long? tourStopId = null,
        long? arAnchorId = null,
        long? nfcTagId = null)
    {
        using var editorClient = factory.AsContentEditor();

        var response = await editorClient.PostAsJsonAsync("/api/locations", new CreateLocationDetailRequest
        {
            ContentId = contentId,
            Latitude = MonumentLatitude,
            Longitude = MonumentLongitude,
            Label = label,
            TourStopId = tourStopId,
            ArAnchorId = arAnchorId,
            NfcTagId = nfcTagId,
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        return (await response.Content.ReadFromJsonAsync<LocationDetailResponse>())!.Id;
    }

    private async Task TranslateAsync(string entityType, long entityId, string fieldName, string value)
    {
        using var editorClient = factory.AsContentEditor();

        var response = await editorClient.PutAsJsonAsync("/api/translations", new UpsertTranslationRequest
        {
            EntityType = entityType,
            EntityId = entityId,
            FieldName = fieldName,
            LanguageCode = "en",
            Value = value,
        });

        response.EnsureSuccessStatusCode();
    }
}
