using System.Net;
using System.Net.Http.Json;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Models.Requests;
using WebAppBase.Api.Models.Responses;
using WebAppBase.Tests.Integration.Infrastructure;

namespace WebAppBase.Tests.Integration;

/// <summary>
/// Covers language resolution on the public surface and the audit trail behind mutations.
/// </summary>
public sealed class TranslationAndAuditTests : IClassFixture<WebAppApiFactory>
{
    private readonly WebAppApiFactory factory;

    public TranslationAndAuditTests(WebAppApiFactory factory) => this.factory = factory;

    [Fact]
    public async Task RequestedLanguage_ReplacesTheDefaultLanguageText()
    {
        await factory.SeedTenantSettingsAsync("af", "en");
        var contentId = await CreatePublishedContentAsync("vertaal-afdeling", "Besoek ons plaas");

        using var editorClient = factory.AsContentEditor();
        var upsertResponse = await editorClient.PutAsJsonAsync("/api/translations", new UpsertTranslationRequest
        {
            EntityType = EntityTypeNames.Content,
            EntityId = contentId,
            FieldName = TranslatableFieldNames.Title,
            LanguageCode = "en",
            Value = "Visit our farm"
        });
        upsertResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        using var visitorClient = factory.AsAnonymous();

        var english = await visitorClient.GetFromJsonAsync<PublicContentResponse>(
            $"/api/public/content/{contentId}?language=en");
        english!.Title.Should().Be("Visit our farm");

        var afrikaans = await visitorClient.GetFromJsonAsync<PublicContentResponse>(
            $"/api/public/content/{contentId}?language=af");
        afrikaans!.Title.Should().Be("Besoek ons plaas");
    }

    [Fact]
    public async Task MissingTranslation_FallsBackToTheDefaultLanguage()
    {
        await factory.SeedTenantSettingsAsync("af", "en");
        var contentId = await CreatePublishedContentAsync("terugval-afdeling", "Slegs in Afrikaans");

        using var visitorClient = factory.AsAnonymous();
        var english = await visitorClient.GetFromJsonAsync<PublicContentResponse>(
            $"/api/public/content/{contentId}?language=en");

        english!.Title.Should().Be("Slegs in Afrikaans");
    }

    [Fact]
    public async Task LanguageOutsideTheActiveList_IsRejected()
    {
        await factory.SeedTenantSettingsAsync("af", "en");

        using var visitorClient = factory.AsAnonymous();
        var response = await visitorClient.GetAsync("/api/public/content?language=zu");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task TranslationForAnInactiveLanguage_IsRejected()
    {
        await factory.SeedTenantSettingsAsync("af", "en");
        var contentId = await CreatePublishedContentAsync("taal-afdeling", "Titel");

        using var editorClient = factory.AsContentEditor();
        var response = await editorClient.PutAsJsonAsync("/api/translations", new UpsertTranslationRequest
        {
            EntityType = EntityTypeNames.Content,
            EntityId = contentId,
            FieldName = TranslatableFieldNames.Title,
            LanguageCode = "zu",
            Value = "Vhusiku"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task RepeatedUpsert_ReplacesRatherThanDuplicates()
    {
        await factory.SeedTenantSettingsAsync("af", "en");
        var contentId = await CreatePublishedContentAsync("herhaal-afdeling", "Oorspronklik");

        using var editorClient = factory.AsContentEditor();

        foreach (var value in new[] { "First", "Second", "Third" })
        {
            var response = await editorClient.PutAsJsonAsync("/api/translations", new UpsertTranslationRequest
            {
                EntityType = EntityTypeNames.Content,
                EntityId = contentId,
                FieldName = TranslatableFieldNames.Title,
                LanguageCode = "en",
                Value = value
            });
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        var translations = await editorClient.GetFromJsonAsync<IReadOnlyList<TranslationResponse>>(
            $"/api/translations?entityType={EntityTypeNames.Content}&entityId={contentId}");

        translations!.Should().ContainSingle();
        translations[0].Value.Should().Be("Third");
    }

    [Fact]
    public async Task ContentMutations_AreWrittenToTheAuditTrail()
    {
        await factory.SeedTenantSettingsAsync();
        var contentId = await CreatePublishedContentAsync("oudit-afdeling", "Ouditbare inhoud");

        using var adminClient = factory.AsAdmin();
        var auditPage = await adminClient.GetFromJsonAsync<PagedResponse<AuditLogResponse>>(
            $"/api/audit-logs?entityType={EntityTypeNames.Content}&entityId={contentId}");

        auditPage!.Items.Should().ContainSingle();
        auditPage.Items[0].Action.Should().Be(Api.Domain.Enums.AuditAction.Created);
        auditPage.Items[0].NewValues.Should().NotBeNull();
    }

    [Fact]
    public async Task AuditEntries_RecordTheActingUser()
    {
        await factory.SeedTenantSettingsAsync();

        using var adminClient = factory.WithRoles(Roles.Admin);
        adminClient.DefaultRequestHeaders.Add(TestAuthHandler.UserIdHeaderName, "gebruiker-42");

        var response = await adminClient.PostAsJsonAsync("/api/categories", new CreateCategoryRequest
        {
            Name = "Toegeskryf",
            Slug = "toegeskryf"
        });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var category = (await response.Content.ReadFromJsonAsync<CategoryResponse>())!;

        var auditPage = await adminClient.GetFromJsonAsync<PagedResponse<AuditLogResponse>>(
            $"/api/audit-logs?entityType={EntityTypeNames.Category}&entityId={category.Id}");

        auditPage!.Items.Should().ContainSingle();
        auditPage.Items[0].ActorUserId.Should().Be("gebruiker-42");
    }

    private async Task<long> CreatePublishedContentAsync(string categorySlug, string title)
    {
        using var adminClient = factory.AsAdmin();
        var categoryResponse = await adminClient.PostAsJsonAsync("/api/categories", new CreateCategoryRequest
        {
            Name = categorySlug,
            Slug = categorySlug
        });
        categoryResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var category = (await categoryResponse.Content.ReadFromJsonAsync<CategoryResponse>())!;

        using var editorClient = factory.AsContentEditor();
        var contentResponse = await editorClient.PostAsJsonAsync("/api/content", new CreateContentRequest
        {
            CategoryId = category.Id,
            Title = title,
            PublishedAt = DateTimeOffset.UtcNow.AddMinutes(-5)
        });
        contentResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var content = (await contentResponse.Content.ReadFromJsonAsync<ContentResponse>())!;

        return content.Id;
    }
}
