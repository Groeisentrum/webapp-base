namespace WebAppBase.Api.Domain.Enums;

/// <summary>
/// How a content item's media is stored and therefore how it must be rendered.
/// </summary>
public enum AssetType
{
    None = 0,
    YouTube = 1,
    S3 = 2,
    SelfHosted = 3,
    ExternalLink = 4,
    Image = 5
}
