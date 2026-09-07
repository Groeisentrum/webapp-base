namespace WebAppBase.Api.Domain.Enums;

/// <summary>
/// What a menu item points at. Determines which target field on the menu item is authoritative.
/// </summary>
public enum MenuLinkType
{
    None = 0,
    Category = 1,
    StaticPage = 2,
    ExternalLink = 3
}
