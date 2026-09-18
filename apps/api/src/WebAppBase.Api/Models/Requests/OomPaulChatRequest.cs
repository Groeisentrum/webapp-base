using System.ComponentModel.DataAnnotations;

namespace WebAppBase.Api.Models.Requests;

/// <summary>
/// One turn in a conversation with Oom Paul.
/// </summary>
/// <remarks>
/// Carries no visitor identity. <see cref="SessionId"/> is opaque and chosen by the
/// caller only to keep a conversation's turns together in AgentCore's memory; omit it
/// to start a new conversation.
/// </remarks>
public sealed class OomPaulChatRequest
{
    [Required]
    [MaxLength(2000)]
    public string Message { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? SessionId { get; set; }
}
