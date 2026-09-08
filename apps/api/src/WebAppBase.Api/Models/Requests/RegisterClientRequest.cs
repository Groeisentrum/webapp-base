using System.ComponentModel.DataAnnotations;

namespace WebAppBase.Api.Models.Requests;

/// <summary>
/// Self-registration by a site visitor.
/// </summary>
public sealed class RegisterClientRequest
{
    [Required]
    [MinLength(3)]
    [MaxLength(256)]
    public string UserName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(320)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(12)]
    [MaxLength(256)]
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// Must be true. POPIA consent has to be a positive act, so this is never
    /// defaulted or inferred — an unticked box fails validation.
    /// </summary>
    [Required]
    public bool ConsentToPrivacyPolicy { get; set; }

    /// <summary>Must be true.</summary>
    [Required]
    public bool AcceptTerms { get; set; }
}
