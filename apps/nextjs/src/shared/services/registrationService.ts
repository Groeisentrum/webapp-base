export type RegistrationInput = {
  userName: string;
  email: string;
  password: string;
  consentToPrivacyPolicy: boolean;
  acceptTerms: boolean;
};

/** Outcome of step one. A code has been sent; no account exists yet. */
export type RegistrationStarted = {
  pendingId: string;
  expiresAt: string;
  /** SkaapHond's redacted address, so the visitor knows which inbox to check. */
  recipientMasked: string | null;
};

export type RegistrationResult = {
  userName: string;
  email: string;
  consentedAt: string;
};

/**
 * Registration runs in two steps: the address is verified before the account is
 * created, so no account ever exists for an unproven address.
 *
 * None of these are wrapped in the auto-logout fetcher — the caller is by definition
 * signed out, so a failure here is never a session problem.
 */
export async function startRegistration(input: RegistrationInput): Promise<RegistrationStarted> {
  return post<RegistrationStarted>("start", input);
}

/**
 * Verifies the code and creates the account.
 *
 * Sends no email or username: the API takes those from the record written at step one,
 * so a verified address cannot be swapped for another one here.
 */
export async function completeRegistration(input: {
  pendingId: string;
  code: string;
  password: string;
}): Promise<RegistrationResult> {
  return post<RegistrationResult>("complete", input);
}

export async function resendRegistrationCode(pendingId: string): Promise<RegistrationStarted> {
  return post<RegistrationStarted>("resend", { pendingId });
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

async function post<TResult>(action: string, body: unknown): Promise<TResult> {
  const response = await fetch(`/api/register/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as TResult;
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
