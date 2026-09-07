namespace WebAppBase.Api.Domain.Constants;

/// <summary>
/// Stable discriminators for the soft EntityType+EntityId links used by
/// translations and audit entries. Values are persisted, so they must not change.
/// </summary>
public static class EntityTypeNames
{
    public const string TenantSettings = nameof(TenantSettings);
    public const string Category = nameof(Category);
    public const string Content = nameof(Content);
    public const string MenuItem = nameof(MenuItem);
    public const string LocationDetail = nameof(LocationDetail);
}
