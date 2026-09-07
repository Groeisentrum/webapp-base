using WebAppBase.Api.Domain.Constants;
using WebAppBase.Api.Domain.ValueObjects;

namespace WebAppBase.Tests.Unit.Domain;

public sealed class FeatureFlagsTests
{
    [Fact]
    public void Empty_TreatsEveryFlagAsDisabled()
    {
        var flags = FeatureFlags.Empty();

        flags.IsEnabled(FeatureFlagNames.AugmentedReality).Should().BeFalse();
    }

    [Fact]
    public void UnknownFlag_IsDisabled()
    {
        var flags = new FeatureFlags(new Dictionary<string, bool> { ["somethingElse"] = true });

        flags.IsEnabled(FeatureFlagNames.Chatbot).Should().BeFalse();
    }

    [Fact]
    public void EnabledFlag_IsReported()
    {
        var flags = new FeatureFlags(new Dictionary<string, bool> { [FeatureFlagNames.VirtualTour] = true });

        flags.IsEnabled(FeatureFlagNames.VirtualTour).Should().BeTrue();
    }

    [Fact]
    public void FlagLookup_IgnoresCase()
    {
        var flags = new FeatureFlags(new Dictionary<string, bool> { ["VIRTUALTOUR"] = true });

        flags.IsEnabled(FeatureFlagNames.VirtualTour).Should().BeTrue();
    }

    [Fact]
    public void With_DoesNotMutateTheOriginal()
    {
        var original = FeatureFlags.Empty();

        var updated = original.With(FeatureFlagNames.Nfc, true);

        original.IsEnabled(FeatureFlagNames.Nfc).Should().BeFalse();
        updated.IsEnabled(FeatureFlagNames.Nfc).Should().BeTrue();
    }

    [Fact]
    public void ClientDefinedFlag_IsSupportedWithoutCodeChange()
    {
        var flags = new FeatureFlags(new Dictionary<string, bool> { ["clientSpecificModule"] = true });

        flags.IsEnabled("clientSpecificModule").Should().BeTrue();
    }
}
