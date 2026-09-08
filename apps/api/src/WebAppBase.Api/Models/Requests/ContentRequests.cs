using System.ComponentModel.DataAnnotations;
using WebAppBase.Api.Domain.Enums;

namespace WebAppBase.Api.Models.Requests;

/// <summary>
/// Creates a content item.
/// </summary>
/// <remarks>
/// The publish window and the event window are independent: setting event dates
/// does not publish an item, and publishing does not imply an event.
/// </remarks>
public sealed class CreateContentRequest
{
    [Required]
    public long CategoryId { get; set; }

    [Required]
    [MaxLength(300)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; set; }

    public string? Body { get; set; }

    public AssetType AssetType { get; set; } = AssetType.None;

    [MaxLength(2048)]
    public string? AssetReference { get; set; }

    public DateTimeOffset? PublishedAt { get; set; }

    public DateTimeOffset? UnpublishedAt { get; set; }

    public DateTimeOffset? EventStart { get; set; }

    public DateTimeOffset? EventEnd { get; set; }

    public RecurrenceRequest? Recurrence { get; set; }

    /// <summary>Who may see this. Can only narrow what the category already allows.</summary>
    public Visibility Visibility { get; set; } = Visibility.Public;

    /// <summary>Roles admitted when Visibility is Restricted.</summary>
    public IReadOnlyList<string> VisibleToRoles { get; set; } = [];
}

/// <summary>
/// Updates a content item.
/// </summary>
public sealed class UpdateContentRequest
{
    [Required]
    public long CategoryId { get; set; }

    [Required]
    [MaxLength(300)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; set; }

    public string? Body { get; set; }

    public AssetType AssetType { get; set; } = AssetType.None;

    [MaxLength(2048)]
    public string? AssetReference { get; set; }

    public DateTimeOffset? PublishedAt { get; set; }

    public DateTimeOffset? UnpublishedAt { get; set; }

    public DateTimeOffset? EventStart { get; set; }

    public DateTimeOffset? EventEnd { get; set; }

    public RecurrenceRequest? Recurrence { get; set; }

    /// <summary>Who may see this. Can only narrow what the category already allows.</summary>
    public Visibility Visibility { get; set; } = Visibility.Public;

    /// <summary>Roles admitted when Visibility is Restricted.</summary>
    public IReadOnlyList<string> VisibleToRoles { get; set; } = [];
}

/// <summary>
/// Weekday-based repetition. Weekly needs a weekday; monthly needs a weekday and
/// which occurrence of it in the month.
/// </summary>
public sealed class RecurrenceRequest
{
    public RecurrenceFrequency Frequency { get; set; } = RecurrenceFrequency.None;

    public DayOfWeek? DayOfWeek { get; set; }

    public WeekOfMonth? WeekOfMonth { get; set; }
}
