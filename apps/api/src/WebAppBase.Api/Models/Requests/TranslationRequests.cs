using System.ComponentModel.DataAnnotations;

namespace WebAppBase.Api.Models.Requests;

/// <summary>
/// Creates or replaces the translation of one field, in one language, for one entity.
/// Upserts, so re-sending the same target is safe.
/// </summary>
public sealed class UpsertTranslationRequest
{
    [Required]
    [MaxLength(100)]
    public string EntityType { get; set; } = string.Empty;

    [Required]
    public long EntityId { get; set; }

    [Required]
    [MaxLength(100)]
    public string FieldName { get; set; } = string.Empty;

    [Required]
    [MaxLength(16)]
    public string LanguageCode { get; set; } = string.Empty;

    [Required]
    public string Value { get; set; } = string.Empty;
}
