export type OomPaulChatResponse = {
  sessionId: string;
  reply: string;
};

const GENERIC_ERROR_MESSAGE =
  "Jammer, iets het verkeerd geloop. Probeer asseblief weer.";
const RATE_LIMITED_MESSAGE =
  "Jy stuur te vinnig boodskappe. Wag 'n bietjie en probeer weer.";

/**
 * Sends one chat turn to Oom Paul, always through this app's own `/api/oompaul`
 * route — the widget only ever runs in the browser, so there is no server-side path
 * to resolve the way the other public services do.
 *
 * Throws with a message that is already safe to show the visitor directly.
 */
export async function sendOomPaulMessage(
  message: string,
  sessionId: string | null,
): Promise<OomPaulChatResponse> {
  const response = await fetch("/api/oompaul/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ message, sessionId }),
  });

  if (response.status === 429) {
    throw new Error(RATE_LIMITED_MESSAGE);
  }

  if (!response.ok) {
    throw new Error(
      (await readProblemTitle(response)) ?? GENERIC_ERROR_MESSAGE,
    );
  }

  return (await response.json()) as OomPaulChatResponse;
}

async function readProblemTitle(
  response: Response,
): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { title?: string };
    return body.title;
  } catch {
    return undefined;
  }
}
