using WebAppBase.Api.Domain;
using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.Enums;
using WebAppBase.Api.Domain.ValueObjects;

namespace WebAppBase.Tests.Unit.Domain;

public sealed class VisibilityRulesTests
{
    private static readonly Viewer Anonymous = Viewer.Anonymous;
    private static readonly Viewer SignedInClient = new(true, [Roles.Client]);
    private static readonly Viewer SignedInAdmin = new(true, [Roles.Admin]);
    private static readonly Viewer SignedInNoRoles = new(true, []);

    [Fact]
    public void Public_IsVisibleToAnonymous()
    {
        VisibilityRules.AllowsDirectly(Visibility.Public, [], Anonymous).Should().BeTrue();
    }

    [Fact]
    public void Authenticated_IsHiddenFromAnonymous()
    {
        VisibilityRules.AllowsDirectly(Visibility.Authenticated, [], Anonymous).Should().BeFalse();
    }

    [Fact]
    public void Authenticated_IsVisibleToAnySignedInUser()
    {
        VisibilityRules.AllowsDirectly(Visibility.Authenticated, [], SignedInNoRoles).Should().BeTrue();
        VisibilityRules.AllowsDirectly(Visibility.Authenticated, [], SignedInClient).Should().BeTrue();
    }

    [Fact]
    public void Restricted_IsHiddenFromAnonymous()
    {
        VisibilityRules.AllowsDirectly(Visibility.Restricted, [Roles.Client], Anonymous).Should().BeFalse();
    }

    [Fact]
    public void Restricted_IsVisibleToAListedRole()
    {
        VisibilityRules.AllowsDirectly(Visibility.Restricted, [Roles.Client], SignedInClient)
            .Should().BeTrue();
    }

    [Fact]
    public void Restricted_IsHiddenFromAnUnlistedRole()
    {
        VisibilityRules.AllowsDirectly(Visibility.Restricted, [Roles.Client], SignedInAdmin)
            .Should().BeFalse();
    }

    /// <summary>
    /// "Restricted to nobody" must read as closed. Treating an empty list as
    /// unrestricted would turn a half-configured item into a public one.
    /// </summary>
    [Fact]
    public void Restricted_WithNoRolesListed_AdmitsNobody()
    {
        VisibilityRules.AllowsDirectly(Visibility.Restricted, [], SignedInAdmin).Should().BeFalse();
        VisibilityRules.AllowsDirectly(Visibility.Restricted, [], SignedInClient).Should().BeFalse();
    }

    [Fact]
    public void Restricted_MatchesRoleNamesCaseInsensitively()
    {
        var viewer = new Viewer(true, ["client"]);

        VisibilityRules.AllowsDirectly(Visibility.Restricted, [Roles.Client], viewer).Should().BeTrue();
    }

    [Fact]
    public void Chain_AllPublic_IsVisible()
    {
        var chain = new[]
        {
            (Visibility.Public, (IReadOnlyList<string>)[]),
            (Visibility.Public, (IReadOnlyList<string>)[]),
        };

        VisibilityRules.AllowsThroughChain(chain, Anonymous).Should().BeTrue();
    }

    /// <summary>
    /// The central rule: a public item inside a restricted section stays hidden. An
    /// item's own setting may narrow access but must never widen it.
    /// </summary>
    [Fact]
    public void Chain_PublicItemUnderRestrictedAncestor_IsHidden()
    {
        var chain = new[]
        {
            (Visibility.Public, (IReadOnlyList<string>)[]),
            (Visibility.Restricted, (IReadOnlyList<string>)[Roles.Client]),
        };

        VisibilityRules.AllowsThroughChain(chain, Anonymous).Should().BeFalse();
        VisibilityRules.AllowsThroughChain(chain, SignedInAdmin).Should().BeFalse();
    }

    [Fact]
    public void Chain_RestrictedAncestor_IsVisibleToTheListedRole()
    {
        var chain = new[]
        {
            (Visibility.Public, (IReadOnlyList<string>)[]),
            (Visibility.Restricted, (IReadOnlyList<string>)[Roles.Client]),
        };

        VisibilityRules.AllowsThroughChain(chain, SignedInClient).Should().BeTrue();
    }

    [Fact]
    public void Chain_RestrictedItemUnderPublicAncestor_IsStillRestricted()
    {
        var chain = new[]
        {
            (Visibility.Restricted, (IReadOnlyList<string>)[Roles.Client]),
            (Visibility.Public, (IReadOnlyList<string>)[]),
        };

        VisibilityRules.AllowsThroughChain(chain, Anonymous).Should().BeFalse();
        VisibilityRules.AllowsThroughChain(chain, SignedInClient).Should().BeTrue();
    }

    /// <summary>
    /// Two levels restricted to different roles admit nobody who lacks both, which is
    /// the intersection an every-level check naturally produces.
    /// </summary>
    [Fact]
    public void Chain_DifferentRestrictionsAtEachLevel_RequiresBoth()
    {
        var chain = new[]
        {
            (Visibility.Restricted, (IReadOnlyList<string>)[Roles.Admin]),
            (Visibility.Restricted, (IReadOnlyList<string>)[Roles.Client]),
        };

        VisibilityRules.AllowsThroughChain(chain, SignedInAdmin).Should().BeFalse();
        VisibilityRules.AllowsThroughChain(chain, SignedInClient).Should().BeFalse();
        VisibilityRules.AllowsThroughChain(chain, new Viewer(true, [Roles.Admin, Roles.Client]))
            .Should().BeTrue();
    }

    [Fact]
    public void Chain_EmptyChain_IsVisible()
    {
        VisibilityRules.AllowsThroughChain([], Anonymous).Should().BeTrue();
    }
}
