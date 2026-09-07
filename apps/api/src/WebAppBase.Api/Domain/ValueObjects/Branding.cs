namespace WebAppBase.Api.Domain.ValueObjects;

/// <summary>
/// Per-deployment visual identity. Every field is optional so a deployment can
/// fall back to the template's own defaults.
/// </summary>
public sealed class Branding
{
    public string? PrimaryColour { get; init; }

    public string? SecondaryColour { get; init; }

    public string? AccentColour { get; init; }

    public string? HeadingFont { get; init; }

    public string? BodyFont { get; init; }

    /// <summary>Asset reference for the logo — interpreted the same way as a content asset reference.</summary>
    public string? LogoReference { get; init; }

    public string? FaviconReference { get; init; }

    public static Branding Empty() => new();
}
