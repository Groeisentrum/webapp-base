namespace WebAppBase.Api.Domain.Constants;

/// <summary>
/// Role names as issued by SkaapHond in the JWT role claim. These are the only
/// two roles this template recognises; there is no local role table.
/// </summary>
public static class Roles
{
    /// <summary>Manages tenant configuration: settings, feature flags, languages, category structure.</summary>
    public const string Admin = "Admin";

    /// <summary>Manages content within the structure an Admin has configured.</summary>
    public const string Content = "Content";
}
