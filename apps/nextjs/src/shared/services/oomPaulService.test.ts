import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ChatError,
  messageForChatError,
  streamChat,
  type ChatEvent,
} from "@/shared/services/oomPaulService";

/**
 * The stream is where this breaks in the field: SSE frames arrive split at whatever
 * boundary the network chose. These pin that, the endpoint the turn is sent to, and the
 * failure codes a caller needs to tell one outage apart from another.
 */
function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });

  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

function problemResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });
}

function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn<(input: unknown, init?: RequestInit) => Promise<Response>>(() =>
    Promise.resolve(responses.shift()!),
  );
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

async function collect(events: AsyncGenerator<ChatEvent>): Promise<ChatEvent[]> {
  const collected: ChatEvent[] = [];

  for await (const event of events) {
    collected.push(event);
  }

  return collected;
}

function sentBody(fetchMock: ReturnType<typeof stubFetch>, call = 0) {
  return JSON.parse(String(fetchMock.mock.calls[call][1]?.body));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("streamChat", () => {
  it("reassembles a frame split across two chunks", async () => {
    stubFetch(
      sseResponse([
        'data: {"kind":"session","sessionId":"abc"}\n\ndata: {"kind":"del',
        'ta","text":"Hallo"}\n\ndata: {"kind":"done"}\n\n',
      ]),
    );

    expect(await collect(streamChat("hallo", null))).toEqual([
      { kind: "session", sessionId: "abc" },
      { kind: "delta", text: "Hallo" },
    ]);
  });

  /**
   * The widget used to post to /api/oompaul/chat, which did not forward the caller's
   * address. The API partitions its rate limiter on that header, so every visitor was
   * spending one shared bucket of twenty turns per five minutes. Pinning the path
   * because nothing else would notice it drifting back.
   */
  it("goes through the proxy that forwards the caller's address", async () => {
    const fetchMock = stubFetch(sseResponse(['data: {"kind":"done"}\n\n']));

    await collect(streamChat("hallo", null));

    // The route exists at this exact path and switches to the upstream stream endpoint
    // on the Accept header. Asking for a URL a route file does not back would fall
    // through to the GET-only public proxy, which fetch stubs happily hide.
    expect(fetchMock.mock.calls[0][0]).toBe("/api/public/oompaul/chat");
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      Accept: "text/event-stream",
    });
  });

  /**
   * The session id belongs to the caller's stored conversation, not to this module. A
   * second copy here is one that could fall out of step with the messages it threads.
   */
  it("sends the session id it was given rather than one of its own", async () => {
    const fetchMock = stubFetch(sseResponse(['data: {"kind":"done"}\n\n']));

    await collect(streamChat("hallo", "sessie-123"));

    expect(sentBody(fetchMock)).toEqual({ message: "hallo", sessionId: "sessie-123" });
  });

  it("surfaces the code carried by an error frame", async () => {
    stubFetch(
      sseResponse([
        'data: {"kind":"delta","text":"Goeie"}\n\ndata: {"kind":"error","code":"oompaul_failed"}\n\n',
      ]),
    );

    await expect(collect(streamChat("hallo", null))).rejects.toMatchObject({
      code: "oompaul_failed",
    });
  });

  it("stops at the done frame", async () => {
    stubFetch(
      sseResponse([
        'data: {"kind":"delta","text":"Hallo"}\n\ndata: {"kind":"done"}\n\ndata: {"kind":"delta","text":"na"}\n\n',
      ]),
    );

    expect(await collect(streamChat("hallo", null))).toEqual([{ kind: "delta", text: "Hallo" }]);
  });

  it("surfaces oompaul_unavailable when the assistant is switched off", async () => {
    stubFetch(
      problemResponse(503, {
        code: "oompaul_unavailable",
        title: "Oom Paul is nie vir hierdie werf beskikbaar nie.",
      }),
    );

    await expect(collect(streamChat("hallo", null))).rejects.toMatchObject({
      code: "oompaul_unavailable",
      status: 503,
      detail: "Oom Paul is nie vir hierdie werf beskikbaar nie.",
    });
  });

  it("keeps the status when a refusal names no code", async () => {
    stubFetch(problemResponse(429, {}));

    await expect(collect(streamChat("hallo", null))).rejects.toMatchObject({ status: 429 });
  });
});

describe("messageForChatError", () => {
  /**
   * The API writes its refusals in Afrikaans already, so its wording reaches the
   * visitor rather than something this layer invents from a code.
   */
  it("prefers the API's own sentence", () => {
    const error = new ChatError("oompaul_unavailable", 503, "Oom Paul is nie beskikbaar nie.");

    expect(messageForChatError(error)).toBe("Oom Paul is nie beskikbaar nie.");
  });

  /**
   * A 429 body names no code and carries no title, so the one sentence that tells the
   * visitor to simply wait has to come from here.
   */
  it("tells a throttled visitor to wait", () => {
    expect(messageForChatError(new ChatError("oompaul_failed", 429))).toMatch(/te vinnig/);
  });

  it("falls back to something readable when the failure says nothing useful", () => {
    expect(messageForChatError(new ChatError("oompaul_failed", 500))).toMatch(/verkeerd geloop/);
  });

  it("handles a failure that is not a ChatError at all", () => {
    expect(messageForChatError(new TypeError("Failed to fetch"))).toBe("Failed to fetch");
  });
});
