namespace WebAppBase.Api.Domain.ValueObjects;

/// <summary>
/// Public contact details surfaced in footers and contact pages.
/// </summary>
public sealed class ContactInfo
{
    public string? EmailAddress { get; init; }

    public string? PhoneNumber { get; init; }

    public string? PhysicalAddress { get; init; }

    public string? PostalAddress { get; init; }

    /// <summary>
    /// Social presences, keyed by platform ("facebook", "instagram", …), each holding
    /// the profile URL. An open map rather than a fixed set of columns: which platforms
    /// matter differs per client and changes faster than a schema should, so a
    /// deployment adds one by configuring it, not by a migration.
    /// </summary>
    public IReadOnlyDictionary<string, string> SocialLinks { get; init; } =
        new Dictionary<string, string>();

    public static ContactInfo Empty() => new();
}
