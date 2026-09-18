/**
 * Both clients below go through this route rather than `/api/oompaul/chat`, which it
 * replaced. It forwards X-Forwarded-For; without that header the API sees only the
 * webhost container and buckets every visitor on the site together, so the first 20
 * turns in five minutes exhaust the rate limit for everyone.
 */
const CHAT_ENDPOINT = "/api/public/oompaul/chat";

export type OomPaulChatResponse = {
  sessionId: string;
  reply: string;
};

const GENERIC_ERROR_MESSAGE =
  "Jammer, iets het verkeerd geloop. Probeer asseblief weer.";
const RATE_LIMITED_MESSAGE =
  "Jy stuur te vinnig boodskappe. Wag 'n bietjie en probeer weer.";

/**
 * Sends one chat turn to Oom Paul and waits for the whole reply.
 *
 * Goes through this app's own proxy rather than straight at the API: the widget only
 * ever runs in the browser, so there is no server-side path to resolve the way the
 * other public services do. That proxy forwards the caller's address, which decides
 * whose rate-limit bucket the turn is spent from — see CHAT_ENDPOINT.
 *
 * Throws with a message that is already safe to show the visitor directly.
 */
export async function sendOomPaulMessage(
  message: string,
  sessionId: string | null,
): Promise<OomPaulChatResponse> {
  const response = await fetch(CHAT_ENDPOINT, {
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

// ---------------------------------------------------------------------------
// Streaming client for POST /api/public/oompaul/chat/stream.
//
// The same turn as sendOomPaulMessage above, delivered as server-sent events so the
// reply appears while it is still being written. Not yet wired to the widget, which
// still waits for the whole answer.
// ---------------------------------------------------------------------------

const SESSION_STORAGE_KEY = "oompaul.sessionId";

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
 * reading a bare status. `status` is kept because the 429 body names no code of its own.
 */
export class ChatError extends Error {
  constructor(
    readonly code: string,
    readonly status?: number,
  ) {
    super(code);
    this.name = "ChatError";
  }
}

/**
 * Streams one turn, yielding the session id first and then each delta as it lands.
 *
 * The session id round-trip is protocol, not presentation: it is read from
 * `sessionStorage` before the turn and whatever the server answers with is written back,
 * so the API can thread the conversation without the caller tracking it.
 */
export async function* streamChat(
  message: string,
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const response = await post(message, "text/event-stream", signal);

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

        if (frame?.kind === "session") {
          writeSessionId(frame.sessionId);
          yield frame;
        } else if (frame?.kind === "delta") {
          yield frame;
        } else if (frame?.kind === "done") {
          return;
        } else if (frame?.kind === "error") {
          throw new ChatError(frame.code);
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

/** The buffered fallback, for callers that would rather wait for the whole answer. */
export async function sendChat(message: string): Promise<{ sessionId: string; reply: string }> {
  const response = await post(message, "application/json");

  if (!response.ok) {
    throw await readChatError(response);
  }

  const payload = (await response.json()) as { sessionId: string; reply: string };
  writeSessionId(payload.sessionId);

  return payload;
}

type ChatFrame = ChatEvent | { kind: "done" } | { kind: "error"; code: string };

function post(message: string, accept: string, signal?: AbortSignal): Promise<Response> {
  return fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: accept },
    body: JSON.stringify({ message, sessionId: readSessionId() }),
    signal,
  });
}

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
    const payload = (await response.json()) as { code?: unknown } | null;

    if (typeof payload?.code === "string" && payload.code.length > 0) {
      return new ChatError(payload.code, response.status);
    }
  } catch {
    // Falls through: not every failure answers with ProblemDetails.
  }

  return new ChatError("oompaul_failed", response.status);
}

function readSessionId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    // Private-mode browsers throw on access. Starting a fresh conversation is a far
    // better outcome than failing the turn.
    return null;
  }
}

function writeSessionId(sessionId: string): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  } catch {
    // As above: the conversation continues, it just will not survive a reload.
  }
}
