namespace WebAppBase.Api.Domain;

/// <summary>
/// Mirrors SkaapHond's password rules so a password this app accepts is one SkaapHond
/// will also accept.
/// </summary>
/// <remarks>
/// Kept deliberately identical rather than stricter. Being stricter would reject
/// passwords the auth service allows; being laxer is worse still, because SkaapHond
/// would reject the account and the caller would see a generic failure with no idea
/// which field was wrong.
/// </remarks>
public static class PasswordPolicy
{
    public const int MinimumLength = 8;

    /// <summary>Afrikaans, user-facing: this is shown directly on the registration form.</summary>
    public const string RequirementsMessage =
        "Die wagwoord moet ten minste 8 karakters wees en 'n hoofletter, kleinletter, "
        + "syfer en spesiale karakter bevat.";

    public static bool IsSatisfiedBy(string? password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < MinimumLength)
        {
            return false;
        }

        var hasUpper = false;
        var hasLower = false;
        var hasDigit = false;
        var hasSpecial = false;

        foreach (var character in password)
        {
            if (char.IsUpper(character)) hasUpper = true;
            else if (char.IsLower(character)) hasLower = true;
            else if (char.IsDigit(character)) hasDigit = true;
            else hasSpecial = true;
        }

        return hasUpper && hasLower && hasDigit && hasSpecial;
    }
}
