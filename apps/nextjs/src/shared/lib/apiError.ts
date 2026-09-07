const GENERIC_MESSAGE = "Iets het verkeerd geloop. Probeer asseblief weer.";

export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Extracts a message safe to show a user from a failed response.
 *
 * The API answers with ProblemDetails whose title is already user-facing Afrikaans.
 * Anything unrecognised collapses to a generic message rather than risking a raw
 * database or stack-trace string reaching the screen.
 */
export async function getUserMessageFromFailedResponse(response: Response): Promise<string> {
  try {
    const payload = await response.clone().json();

    if (payload && typeof payload === "object") {
      const record = payload as Record<string, unknown>;
      const title = record.title ?? record.message;

      if (typeof title === "string" && title.trim().length > 0) {
        return title;
      }
    }
  } catch {
    // Falls through to the generic message.
  }

  return GENERIC_MESSAGE;
}

export async function getErrorCodeFromFailedResponse(response: Response): Promise<string | undefined> {
  try {
    const payload = await response.clone().json();

    if (payload && typeof payload === "object") {
      const code = (payload as Record<string, unknown>).code;
      if (typeof code === "string") {
        return code;
      }
    }
  } catch {
    // No code available.
  }

  return undefined;
}

/** Never leaks technical detail; unknown throwables collapse to the generic message. */
export function getSafeUserMessageFromUnknownError(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  return GENERIC_MESSAGE;
}
