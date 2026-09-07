namespace WebAppBase.Api.Domain.Constants;

/// <summary>
/// Authorisation policy names.
/// </summary>
public static class PolicyNames
{
    /// <summary>Tenant configuration: settings, feature flags, languages, category structure.</summary>
    public const string AdminOnly = "AdminOnly";

    /// <summary>
    /// Content management. Admins are included deliberately — an Admin configuring a
    /// site should not be locked out of the content it holds.
    /// </summary>
    public const string ContentManagement = "ContentManagement";
}
