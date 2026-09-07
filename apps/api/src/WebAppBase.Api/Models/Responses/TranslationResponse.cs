namespace WebAppBase.Api.Models.Responses;

/// <summary>
/// One translated field value.
/// </summary>
public sealed record TranslationResponse(
    long Id,
    string EntityType,
    long EntityId,
    string FieldName,
    string LanguageCode,
    string Value,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);
