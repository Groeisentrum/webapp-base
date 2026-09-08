namespace WebAppBase.Api.Domain.Enums;

/// <summary>
/// Who may see an item.
/// </summary>
/// <remarks>
/// Enforced in the API, not merely hidden in navigation. Hiding a menu entry leaves
/// the underlying URL reachable, and on this template URLs travel — NFC tags and QR
/// codes are URL distribution mechanisms.
/// </remarks>
public enum Visibility
{
    /// <summary>Anyone, signed in or not. The default, so existing rows are unaffected.</summary>
    Public = 0,

    /// <summary>Any signed-in user, whatever their role.</summary>
    Authenticated = 1,

    /// <summary>Only the roles listed on the item.</summary>
    Restricted = 2
}
