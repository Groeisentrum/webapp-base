namespace WebAppBase.Api.Services;

/// <summary>
/// Creates accounts in SkaapHond. This is the only place that talks to its user API.
/// </summary>
public interface ISkaaphondUserClient
{
    /// <summary>
    /// Creates an account carrying the configured client role.
    /// Returns the new user's id, or null when SkaapHond rejected the request.
    /// </summary>
    Task<SkaaphondUserCreationResult> CreateClientUserAsync(
        string userName,
        string email,
        string password,
        CancellationToken cancellationToken);
}

/// <param name="UserId">SkaapHond's id for the new account, when creation succeeded.</param>
/// <param name="FailureReason">
/// Upstream detail for the log. Never surfaced to the caller — it can disclose whether
/// an account already exists.
/// </param>
public sealed record SkaaphondUserCreationResult(bool Succeeded, string? UserId, string? FailureReason)
{
    public static SkaaphondUserCreationResult Success(string userId) => new(true, userId, null);

    public static SkaaphondUserCreationResult Failure(string reason) => new(false, null, reason);
}
