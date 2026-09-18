namespace WebAppBase.Api.Domain.Results;

/// <summary>
/// Machine-readable error identifiers returned to callers alongside a human message.
/// </summary>
public static class ErrorCodes
{
    public const string ValidationFailed = "validation_failed";
    public const string NotFound = "not_found";
    public const string SlugAlreadyUsed = "slug_already_used";
    public const string ParentCategoryNotFound = "parent_category_not_found";
    public const string CategoryCycle = "category_cycle";
    public const string CategoryHasChildren = "category_has_children";
    public const string CategoryNotFound = "category_not_found";
    public const string ContentNotFound = "content_not_found";
    public const string InvalidPublishWindow = "invalid_publish_window";
    public const string InvalidEventWindow = "invalid_event_window";
    public const string InvalidRecurrence = "invalid_recurrence";
    public const string UnsupportedLanguage = "unsupported_language";
    public const string TranslationNotFound = "translation_not_found";
    public const string MenuItemNotFound = "menu_item_not_found";
    public const string InvalidMenuTarget = "invalid_menu_target";
    public const string LocationNotFound = "location_not_found";
    public const string InvalidCoordinates = "invalid_coordinates";
    public const string TenantSettingsNotInitialised = "tenant_settings_not_initialised";
    public const string ConsentRequired = "consent_required";
    public const string RegistrationDisabled = "registration_disabled";
    public const string RegistrationFailed = "registration_failed";
    public const string PasswordTooWeak = "password_too_weak";
    public const string RegistrationAlreadyCompleted = "registration_already_completed";
    public const string VerificationNotFound = "verification_not_found";
    public const string VerificationCodeIncorrect = "verification_code_incorrect";
    public const string VerificationExpired = "verification_expired";
    public const string VerificationCooldown = "verification_cooldown";
    public const string VerificationUnavailable = "verification_unavailable";
    public const string OomPaulUnavailable = "oompaul_unavailable";
}
