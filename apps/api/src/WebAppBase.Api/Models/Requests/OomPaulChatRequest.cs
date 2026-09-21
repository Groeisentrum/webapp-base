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

    /// <remarks>
    /// AgentCore only accepts 33 to 100 characters of <c>[a-zA-Z0-9-_]</c>. A value
    /// outside that is replaced with a fresh one rather than rejected — a stale or
    /// mangled id costs the visitor their conversation history, not their turn. The id
    /// actually used comes back on the response, and as the first frame of a stream.
    /// </remarks>
    [MaxLength(100)]
    public string? SessionId { get; set; }
}
