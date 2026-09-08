namespace WebAppBase.Api.Domain.Entities;

/// <summary>
/// Evidence that a person consented to the privacy policy and terms at registration.
/// </summary>
/// <remarks>
/// POPIA requires consent to be demonstrable, so a ticked checkbox that is not stored
/// is not compliance. The policy versions are captured alongside the timestamp: when
/// the wording changes you must still be able to show what each person actually agreed
/// to, which is impossible if only "consented: true" was kept.
///
/// Append-only apart from <see cref="WithdrawnAt"/> and <see cref="SkaaphondUserId"/>.
/// Never soft-deleted — erasing the evidence defeats its purpose.
/// </remarks>
public class ConsentRecord
{
    public long Id { get; set; }

    /// <summary>
    /// Set once SkaapHond has created the account. Null means consent was captured but
    /// registration did not complete, which is retained deliberately as an audit trail
    /// of attempts rather than discarded.
    /// </summary>
    public string? SkaaphondUserId { get; set; }

    public string Email { get; set; } = string.Empty;

    public string UserName { get; set; } = string.Empty;

    public string PrivacyPolicyVersion { get; set; } = string.Empty;

    public string TermsVersion { get; set; } = string.Empty;

    public DateTimeOffset ConsentedAt { get; set; }

    /// <summary>Recorded for evidential value; treat as personal information itself.</summary>
    public string? IpAddress { get; set; }

    public string? UserAgent { get; set; }

    /// <summary>Set when the person exercises their right to withdraw consent.</summary>
    public DateTimeOffset? WithdrawnAt { get; set; }
}
