using System.Text.Json;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Domain.ValueObjects;

namespace WebAppBase.Tests.Unit.Data;

/// <summary>
/// Pins the on-disk JSON shape of the value objects stored as JSON columns.
/// </summary>
/// <remarks>
/// Seed scripts write these columns as raw SQL, so a rename here would silently
/// break seeding rather than fail a build. These tests make that a test failure.
/// </remarks>
public sealed class JsonColumnShapeTests
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    [Fact]
    public void FeatureFlags_SerialiseUnderAFlagsProperty()
    {
        var flags = new FeatureFlags(new Dictionary<string, bool>
        {
            [FeatureFlagNames.VirtualTour] = true,
        });

        var json = JsonSerializer.Serialize(flags, SerializerOptions);

        json.Should().Be("""{"flags":{"virtualTour":true}}""");
    }

    [Fact]
    public void FeatureFlags_RoundTrip()
    {
        var original = new FeatureFlags(new Dictionary<string, bool> { ["nfc"] = true });

        var json = JsonSerializer.Serialize(original, SerializerOptions);
        var restored = JsonSerializer.Deserialize<FeatureFlags>(json, SerializerOptions);

        restored!.IsEnabled("nfc").Should().BeTrue();
    }

    [Fact]
    public void Branding_UsesCamelCaseProperties()
    {
        var branding = new Branding { PrimaryColour = "#1f5f4b" };

        var json = JsonSerializer.Serialize(branding, SerializerOptions);

        json.Should().Contain("\"primaryColour\":\"#1f5f4b\"");
        json.Should().Contain("\"logoReference\":null");
    }

    [Fact]
    public void ContactInfo_UsesCamelCaseProperties()
    {
        var contactInfo = new ContactInfo { EmailAddress = "info@voorbeeld.co.za" };

        var json = JsonSerializer.Serialize(contactInfo, SerializerOptions);

        json.Should().Contain("\"emailAddress\":\"info@voorbeeld.co.za\"");
    }

    [Fact]
    public void Recurrence_SerialisesFrequencyNumerically()
    {
        var recurrence = new Recurrence
        {
            Frequency = RecurrenceFrequency.Weekly,
            DayOfWeek = DayOfWeek.Tuesday,
        };

        var json = JsonSerializer.Serialize(recurrence, SerializerOptions);

        json.Should().Contain("\"frequency\":1");
        json.Should().Contain("\"dayOfWeek\":2");
    }

    [Fact]
    public void Recurrence_None_RoundTrips()
    {
        var json = JsonSerializer.Serialize(Recurrence.None(), SerializerOptions);
        var restored = JsonSerializer.Deserialize<Recurrence>(json, SerializerOptions);

        restored!.Frequency.Should().Be(RecurrenceFrequency.None);
        restored.IsValid().Should().BeTrue();
    }

    [Fact]
    public void ActiveLanguageCodes_SerialiseAsAPlainArray()
    {
        var json = JsonSerializer.Serialize<IReadOnlyList<string>>(["af", "en"], SerializerOptions);

        json.Should().Be("""["af","en"]""");
    }
}
