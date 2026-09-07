using System.Text.Json.Serialization;

namespace WebAppBase.Api.Domain.ValueObjects;

/// <summary>
/// Independently togglable feature switches for a deployment. Deliberately an open
/// map rather than fixed properties so a client can add a flag without a migration.
/// An absent flag reads as disabled.
/// </summary>
public sealed class FeatureFlags
{
    public FeatureFlags()
        : this(null)
    {
    }

    [JsonConstructor]
    public FeatureFlags(IReadOnlyDictionary<string, bool>? flags) =>
        Flags = flags is null
            ? new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase)
            : new Dictionary<string, bool>(flags, StringComparer.OrdinalIgnoreCase);

    public IReadOnlyDictionary<string, bool> Flags { get; }

    public static FeatureFlags Empty() => new(null);

    public bool IsEnabled(string flagName) => Flags.TryGetValue(flagName, out var enabled) && enabled;

    public FeatureFlags With(string flagName, bool enabled)
    {
        var updated = new Dictionary<string, bool>(Flags, StringComparer.OrdinalIgnoreCase)
        {
            [flagName] = enabled
        };

        return new FeatureFlags(updated);
    }
}
