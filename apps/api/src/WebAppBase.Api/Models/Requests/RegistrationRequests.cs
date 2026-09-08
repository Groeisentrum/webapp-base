using System.ComponentModel.DataAnnotations;

namespace WebAppBase.Api.Models.Requests;

/// <summary>
/// Second step of self-registration: proves the address, then creates the account.
/// </summary>
/// <remarks>
/// Carries no email or username. Those are read from the consent record the first step
/// wrote, so a caller cannot verify one address and register a different one. The
/// password is resubmitted because it is never stored between the steps.
/// </remarks>
public sealed class CompleteRegistrationRequest
{
    [Required]
    [MaxLength(128)]
    public string PendingId { get; set; } = string.Empty;

    [Required]
    [MaxLength(32)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    [MaxLength(256)]
    public string Password { get; set; } = string.Empty;
}

/// <summary>Requests a fresh code for a verification already in progress.</summary>
public sealed class ResendRegistrationCodeRequest
{
    [Required]
    [MaxLength(128)]
    public string PendingId { get; set; } = string.Empty;
}
