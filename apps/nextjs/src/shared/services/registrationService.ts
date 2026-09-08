export type RegistrationInput = {
  userName: string;
  email: string;
  password: string;
  consentToPrivacyPolicy: boolean;
  acceptTerms: boolean;
};

export type RegistrationResult = {
  userName: string;
  email: string;
  consentedAt: string;
};

/**
 * Registers a site visitor, who receives the Client role.
 *
 * Not wrapped in the auto-logout fetcher: the caller is by definition signed out, so
 * a failure here is never a session problem.
 */
export async function register(input: RegistrationInput): Promise<RegistrationResult> {
  const response = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as RegistrationResult;
}

/** Whether the site should offer registration at all. */
export async function getRegistrationAvailability(): Promise<boolean> {
  try {
    const response = await fetch("/api/public/registration/availability", { cache: "no-store" });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as { selfRegistrationEnabled?: boolean };

    return payload.selfRegistrationEnabled === true;
  } catch {
    return false;
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  if (response.status === 429) {
    return "Te veel pogings. Wag asseblief 'n paar minute en probeer weer.";
  }

  try {
    const payload = await response.json();
    const title = (payload as { title?: string } | null)?.title;

    if (typeof title === "string" && title.trim().length > 0) {
      return title;
    }
  } catch {
    // Falls through to the generic message.
  }

  return "Registrasie kon nie voltooi word nie. Probeer asseblief weer.";
}
