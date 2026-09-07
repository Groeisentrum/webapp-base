namespace WebAppBase.Api.Domain.Constants;

/// <summary>
/// Notification kinds this template dispatches. Persisted on notification rows,
/// so values must stay stable.
/// </summary>
public static class NotificationTypes
{
    public const string ContentPublished = "content_published";
    public const string ContentUnpublished = "content_unpublished";
    public const string TenantSettingsChanged = "tenant_settings_changed";
}
