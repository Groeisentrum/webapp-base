/**
 * Goes through this app's own proxy rather than straight at the API: the widget only
 * ever runs in the browser, so there is no server-side path to resolve the way the
 * other public services do.
 *
 * The route forwards X-Forwarded-For; without that header the API sees only the
 * webhost container and buckets every visitor on the site together, so the first
 * twenty turns in five minutes would exhaust the rate limit for everyone.
 */
const CHAT_ENDPOINT = "/api/public/oompaul/chat";

const GENERIC_ERROR_MESSAGE =
  "Jammer, iets het verkeerd geloop. Probeer asseblief weer.";
const RATE_LIMITED_MESSAGE =
  "Jy stuur te vinnig boodskappe. Wag 'n bietjie en probeer weer.";

/**
 * What a turn yields.
 *
 * The wire carries two more kinds: `done` ends the generator and `error` throws, so a
 * consumer has one success path and one failure path rather than three.
 */
export type ChatEvent =
  | { kind: "session"; sessionId: string }
  | { kind: "delta"; text: string };

/**
 * Carries the API's ProblemDetails `code` — `oompaul_unavailable`, `validation_failed`,
 * `oompaul_failed` — so a caller can tell "switched off" from "went wrong" instead of
 * reading a bare status. `status` is kept because the 429 body names no code of its own,
 * and `detail` holds the API's own Afrikaans sentence when it sent one.
 */
export class ChatError extends Error {
  constructor(
    readonly code: string,
    readonly status?: number,
    readonly detail?: string,
  ) {
    super(detail ?? code);
    this.name = "ChatError";
  }
}

/**
 * Streams one turn, yielding the session id first and then each delta as it lands.
 *
 * The session id is passed in and handed back rather than kept here: the caller already
 * persists the conversation it belongs to, and a second copy in this module would be
 * one that could fall out of step with it.
 */
export async function* streamChat(
  message: string,
  sessionId: string | null,
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  // The proxy serves both shapes on one path and reads Accept to pick the upstream
  // endpoint, so streaming is asked for by the header, never by a different URL.
  const response = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ message, sessionId }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw await readChatError(response);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        return;
      }

      buffer += decoder.decode(value, { stream: true });

      // Frames split at arbitrary chunk boundaries, so only whole ones are parsed and
      // the remainder waits for the next read.
      let boundary = buffer.indexOf("\n\n");

      while (boundary !== -1) {
        const frame = parseFrame(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);

        if (frame?.kind === "session" || frame?.kind === "delta") {
          yield frame;
        } else if (frame?.kind === "done") {
          return;
        } else if (frame?.kind === "error") {
          // The status was 200 before the first frame went out, so a failure this late
          // can only travel as a frame.
          throw new ChatError(frame.code, response.status);
        }

        boundary = buffer.indexOf("\n\n");
      }
    }
  } finally {
    // Abandoning the generator — an abort, or a caller that broke out of the loop —
    // would otherwise leave the connection open.
    await reader.cancel().catch(() => {});
  }
}

/**
 * The sentence to put in front of the visitor. Kept here rather than in the widget so
 * one failure never reads two different ways depending on which screen it reached.
 */
export function messageForChatError(caught: unknown): string {
  if (!(caught instanceof ChatError)) {
    return caught instanceof Error && caught.message ? caught.message : GENERIC_ERROR_MESSAGE;
  }

  if (caught.status === 429) {
    return RATE_LIMITED_MESSAGE;
  }

  // The API writes its own refusals in Afrikaans already, so its wording beats anything
  // this layer could invent from a code.
  return caught.detail ?? GENERIC_ERROR_MESSAGE;
}

type ChatFrame = ChatEvent | { kind: "done" } | { kind: "error"; code: string };

function parseFrame(frame: string): ChatFrame | null {
  const line = frame.split("\n").find((candidate) => candidate.startsWith("data:"));

  if (!line) {
    return null;
  }

  try {
    // An unrecognised kind falls through the caller's checks, so the API can add frames
    // without this having to ship first.
    return JSON.parse(line.slice("data:".length)) as ChatFrame;
  } catch {
    return null;
  }
}

async function readChatError(response: Response): Promise<ChatError> {
  try {
    const payload = (await response.json()) as { code?: unknown; title?: unknown } | null;
    const detail = typeof payload?.title === "string" ? payload.title : undefined;

    if (typeof payload?.code === "string" && payload.code.length > 0) {
      return new ChatError(payload.code, response.status, detail);
    }

    return new ChatError("oompaul_failed", response.status, detail);
  } catch {
    // Not every failure answers with ProblemDetails.
    return new ChatError("oompaul_failed", response.status);
  }
}
