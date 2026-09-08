/**
 * Mirrors SkaapHond's password rules, and the C# PasswordPolicy that also mirrors them.
 *
 * Kept identical rather than stricter: stricter would reject passwords the auth
 * service allows, laxer would let SkaapHond reject the account after the fact with no
 * indication of which field was wrong.
 */
export const MINIMUM_PASSWORD_LENGTH = 8;

export const PASSWORD_REQUIREMENTS_MESSAGE =
  "Die wagwoord moet ten minste 8 karakters wees en 'n hoofletter, kleinletter, syfer en spesiale karakter bevat.";

export function isPasswordAcceptable(password: string): boolean {
  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    return false;
  }

  return (
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    // Anything that is not a letter or digit counts as special, matching the
    // char.IsUpper/IsLower/IsDigit fallthrough on the server.
    /[^A-Za-z0-9]/.test(password)
  );
}
