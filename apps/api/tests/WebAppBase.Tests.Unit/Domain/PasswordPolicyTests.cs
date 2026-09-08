using WebAppBase.Api.Domain;

namespace WebAppBase.Tests.Unit.Domain;

/// <summary>
/// Pins the rules to SkaapHond's: at least eight characters with an uppercase,
/// lowercase, digit and special character.
/// </summary>
public sealed class PasswordPolicyTests
{
    [Theory]
    [InlineData("Wagwoord1!")]
    [InlineData("Aa1!aaaa")]
    [InlineData("Langer-Wagwoord-2026!")]
    public void AcceptsAPasswordMeetingEveryRule(string password)
    {
        PasswordPolicy.IsSatisfiedBy(password).Should().BeTrue();
    }

    [Theory]
    [InlineData("Aa1!aaa", "one character short")]
    [InlineData("wagwoord1!", "no uppercase")]
    [InlineData("WAGWOORD1!", "no lowercase")]
    [InlineData("Wagwoord!", "no digit")]
    [InlineData("Wagwoord1", "no special character")]
    [InlineData("", "empty")]
    public void RejectsAPasswordBreakingAnyRule(string password, string reason)
    {
        PasswordPolicy.IsSatisfiedBy(password).Should().BeFalse(reason);
    }

    [Fact]
    public void RejectsNull()
    {
        PasswordPolicy.IsSatisfiedBy(null).Should().BeFalse();
    }

    /// <summary>Exactly at the boundary, since off-by-one here locks people out.</summary>
    [Fact]
    public void AcceptsExactlyTheMinimumLength()
    {
        var password = "Aa1!aaaa";

        password.Length.Should().Be(PasswordPolicy.MinimumLength);
        PasswordPolicy.IsSatisfiedBy(password).Should().BeTrue();
    }

    [Theory]
    [InlineData("Aa1 aaaa")]
    [InlineData("Aa1_aaaa")]
    [InlineData("Aa1€aaaa")]
    public void TreatsAnyNonAlphanumericAsSpecial(string password)
    {
        PasswordPolicy.IsSatisfiedBy(password).Should().BeTrue();
    }
}
