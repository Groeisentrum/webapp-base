namespace WebAppBase.Api.Domain.Constants;

/// <summary>
/// Named rate-limiting policies.
/// </summary>
public static class RateLimitPolicies
{
    /// <summary>Applied to self-registration, which is anonymous and creates upstream accounts.</summary>
    public const string Registration = "registration";

    /// <summary>Applied to Oom Paul chat, which is anonymous and billed per model call.</summary>
    public const string OomPaulChat = "oompaul-chat";
}
