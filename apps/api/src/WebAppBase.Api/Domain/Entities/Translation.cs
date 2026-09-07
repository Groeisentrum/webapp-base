namespace WebAppBase.Api.Domain.Entities;

/// <summary>
/// One translated field value, linked softly by entity type and id so any
/// user-facing field on any entity can be translated without schema changes.
/// </summary>
public class Translation : AuditableEntity
{
    /// <summary>Discriminator from <c>EntityTypeNames</c>.</summary>
    public string EntityType { get; set; } = string.Empty;

    public long EntityId { get; set; }

    /// <summary>Field name from <c>TranslatableFieldNames</c>.</summary>
    public string FieldName { get; set; } = string.Empty;

    public string LanguageCode { get; set; } = string.Empty;

    public string Value { get; set; } = string.Empty;
}
