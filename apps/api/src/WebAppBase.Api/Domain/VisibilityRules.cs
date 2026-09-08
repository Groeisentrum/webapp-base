using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Domain.ValueObjects;

namespace WebAppBase.Api.Domain;

/// <summary>
/// Decides whether a viewer may see an item.
/// </summary>
/// <remarks>
/// Visibility is checked at every level of the hierarchy rather than folded into a
/// single "effective" value. A restricted category with a public item inside it must
/// hide that item, so the item's own setting can only ever narrow access, never widen it.
/// </remarks>
public static class VisibilityRules
{
    /// <summary>Checks one item's own setting, ignoring any ancestors.</summary>
    public static bool AllowsDirectly(
        Visibility visibility,
        IReadOnlyList<string> visibleToRoles,
        Viewer viewer) => visibility switch
    {
        Visibility.Public => true,
        Visibility.Authenticated => viewer.IsAuthenticated,
        // An empty role list on a restricted item admits nobody. That is deliberate:
        // the safe reading of "restricted to no one" is closed, not open.
        Visibility.Restricted => viewer.IsAuthenticated && visibleToRoles.Any(viewer.HasRole),
        _ => false
    };

    /// <summary>
    /// Checks an item together with its ancestor chain. Every level must allow the
    /// viewer, so a restriction anywhere above hides everything beneath it.
    /// </summary>
    public static bool AllowsThroughChain(
        IEnumerable<(Visibility Visibility, IReadOnlyList<string> VisibleToRoles)> chain,
        Viewer viewer) =>
        chain.All(level => AllowsDirectly(level.Visibility, level.VisibleToRoles, viewer));
}
