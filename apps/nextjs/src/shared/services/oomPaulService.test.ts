import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ChatError,
  sendChat,
  sendOomPaulMessage,
  streamChat,
  type ChatEvent,
} from "@/shared/services/oomPaulService";

/**
 * The stream is where this breaks in the field: SSE frames arrive split at whatever
 * boundary the network chose, and `sessionStorage` throws outright in a private window.
 * These pin both, plus the failure codes the caller needs to tell one outage apart from
 * another.
 */
const SESSION_KEY = "oompaul.sessionId";

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

function stubSessionStorage(store = new Map<string, string>()) {
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  });

  return store;
}

function stubBrokenSessionStorage() {
  vi.stubGlobal("sessionStorage", {
    getItem: () => {
      throw new DOMException("denied");
    },
    setItem: () => {
      throw new DOMException("denied");
    },
  });
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
    stubSessionStorage();
    stubFetch(
      sseResponse([
        'data: {"kind":"session","sessionId":"abc"}\n\ndata: {"kind":"del',
        'ta","text":"Hallo"}\n\ndata: {"kind":"done"}\n\n',
      ]),
    );

    expect(await collect(streamChat("hallo"))).toEqual([
      { kind: "session", sessionId: "abc" },
      { kind: "delta", text: "Hallo" },
    ]);
  });

  it("persists the session id and sends it back on the next turn", async () => {
    const store = stubSessionStorage();
    const fetchMock = stubFetch(
      sseResponse(['data: {"kind":"session","sessionId":"abc"}\n\ndata: {"kind":"done"}\n\n']),
      sseResponse(['data: {"kind":"done"}\n\n']),
    );

    await collect(streamChat("eerste"));

    expect(store.get(SESSION_KEY)).toBe("abc");
    expect(sentBody(fetchMock, 0)).toEqual({ message: "eerste", sessionId: null });

    await collect(streamChat("tweede"));

    expect(sentBody(fetchMock, 1)).toEqual({ message: "tweede", sessionId: "abc" });
  });

  it("keeps streaming when sessionStorage throws", async () => {
    stubBrokenSessionStorage();
    const fetchMock = stubFetch(
      sseResponse([
        'data: {"kind":"session","sessionId":"abc"}\n\ndata: {"kind":"delta","text":"Hallo"}\n\n',
      ]),
    );

    expect(await collect(streamChat("hallo"))).toEqual([
      { kind: "session", sessionId: "abc" },
      { kind: "delta", text: "Hallo" },
    ]);
    expect(sentBody(fetchMock).sessionId).toBeNull();
  });

  it("surfaces the code carried by an error frame", async () => {
    stubSessionStorage();
    stubFetch(sseResponse(['data: {"kind":"error","code":"oompaul_failed"}\n\n']));

    await expect(collect(streamChat("hallo"))).rejects.toMatchObject({
      name: "ChatError",
      code: "oompaul_failed",
    });
  });

  it("stops at the done frame", async () => {
    stubSessionStorage();
    stubFetch(
      sseResponse(['data: {"kind":"done"}\n\ndata: {"kind":"delta","text":"te laat"}\n\n']),
    );

    expect(await collect(streamChat("hallo"))).toEqual([]);
  });

  it("surfaces oompaul_unavailable when the assistant is switched off", async () => {
    stubSessionStorage();
    stubFetch(problemResponse(503, { title: "Nie beskikbaar nie.", code: "oompaul_unavailable" }));

    const error = await collect(streamChat("hallo")).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ChatError);
    expect(error).toMatchObject({ code: "oompaul_unavailable", status: 503 });
  });

  it("keeps the status when a refusal names no code", async () => {
    stubSessionStorage();
    stubFetch(new Response("", { status: 429 }));

    await expect(collect(streamChat("hallo"))).rejects.toMatchObject({
      code: "oompaul_failed",
      status: 429,
    });
  });
});

describe("sendChat", () => {
  it("returns the reply and persists the session id", async () => {
    const store = stubSessionStorage();
    stubFetch(
      new Response(JSON.stringify({ sessionId: "abc", reply: "Goeie dag" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(await sendChat("hallo")).toEqual({ sessionId: "abc", reply: "Goeie dag" });
    expect(store.get(SESSION_KEY)).toBe("abc");
  });

  it("surfaces the ProblemDetails code", async () => {
    stubSessionStorage();
    stubFetch(problemResponse(400, { code: "validation_failed" }));

    await expect(sendChat("")).rejects.toMatchObject({ code: "validation_failed", status: 400 });
  });
});

describe("sendOomPaulMessage", () => {
  /**
   * The widget used to post to /api/oompaul/chat, which did not forward the caller's
   * address. The API partitions its rate limiter on that header, so every visitor was
   * spending one shared bucket of 20 turns per five minutes. Pinning the path here
   * because nothing else would notice it drifting back.
   */
  it("goes through the proxy that forwards the caller's address", async () => {
    const fetchMock = stubFetch(
      new Response(JSON.stringify({ sessionId: "s", reply: "Goeiedag" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await sendOomPaulMessage("Goeiedag", null);

    expect(fetchMock.mock.calls[0][0]).toBe("/api/public/oompaul/chat");
  });

  it("reports a rate-limited turn in words a visitor can read", async () => {
    stubFetch(problemResponse(429, {}));

    await expect(sendOomPaulMessage("Goeiedag", null)).rejects.toThrow(/te vinnig/);
  });

  /**
   * A deployment with the chatbot switched off answers 503 with a ProblemDetails title
   * that is already the sentence to show, so it must reach the visitor unmangled.
   */
  it("surfaces the API's own message when the chat is unavailable", async () => {
    stubFetch(
      problemResponse(503, {
        title: "Oom Paul is nie vir hierdie werf beskikbaar nie.",
        code: "oompaul_unavailable",
      }),
    );

    await expect(sendOomPaulMessage("Goeiedag", null)).rejects.toThrow(
      "Oom Paul is nie vir hierdie werf beskikbaar nie.",
    );
  });
});
