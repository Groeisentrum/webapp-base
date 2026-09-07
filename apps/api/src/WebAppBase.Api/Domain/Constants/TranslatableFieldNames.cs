namespace WebAppBase.Api.Domain.Constants;

/// <summary>
/// Field names that may carry translations. Persisted in the translation table,
/// so values must stay stable.
/// </summary>
public static class TranslatableFieldNames
{
    public const string Name = "Name";
    public const string Title = "Title";
    public const string Description = "Description";
    public const string Body = "Body";
    public const string Label = "Label";
}
