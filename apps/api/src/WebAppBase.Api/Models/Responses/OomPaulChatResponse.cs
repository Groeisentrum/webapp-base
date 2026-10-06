namespace WebAppBase.Api.Models.Responses;

/// <summary>
/// Oom Paul's reply to one chat turn.
/// </summary>
/// <param name="SessionId">
/// Echo this back on the next turn so AgentCore keeps the conversation's history.
/// </param>
public sealed record OomPaulChatResponse(string SessionId, string Reply);
