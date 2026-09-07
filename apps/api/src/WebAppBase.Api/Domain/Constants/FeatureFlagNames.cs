namespace WebAppBase.Api.Domain.Constants;

/// <summary>
/// Flags this template ships with. Feature flags are stored as an open key/value map
/// so a client deployment can introduce its own without a schema change — these
/// constants exist so template code never refers to the shipped ones by literal.
/// </summary>
public static class FeatureFlagNames
{
    public const string AugmentedReality = "augmentedReality";
    public const string VirtualTour = "virtualTour";
    public const string Nfc = "nfc";
    public const string Chatbot = "chatbot";
}
