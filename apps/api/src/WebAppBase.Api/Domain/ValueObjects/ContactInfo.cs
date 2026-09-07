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

    public static ContactInfo Empty() => new();
}
