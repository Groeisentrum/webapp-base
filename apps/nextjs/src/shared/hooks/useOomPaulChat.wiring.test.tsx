import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const streamChat = vi.fn();

vi.mock("@/shared/services/oomPaulService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/services/oomPaulService")>()),
  streamChat: (...args: unknown[]) => streamChat(...args),
}));

const { ChatError } = await import("@/shared/services/oomPaulService");
const { useOomPaulChat } = await import("@/shared/hooks/useOomPaulChat");

/**
 * The hook is where streaming actually happens: the service hands over events, and the
 * conversation the visitor reads is assembled here. What matters is that a turn grows
 * one reply rather than accumulating a message per token, and that a turn which fails
 * halfway keeps whatever Oom Paul already said.
 */
afterEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

type Event = { kind: "session"; sessionId: string } | { kind: "delta"; text: string };

function streamOf(events: Event[], throwAtEnd?: Error) {
  return async function* () {
    for (const event of events) {
      yield event;
    }
    if (throwAtEnd) {
      throw throwAtEnd;
    }
  };
}

const SESSION = "a".repeat(64);

describe("useOomPaulChat streaming a turn", () => {
  it("grows one reply as the deltas land instead of one message per delta", async () => {
    streamChat.mockImplementation(
      streamOf([
        { kind: "session", sessionId: SESSION },
        { kind: "delta", text: "Goeiedag, " },
        { kind: "delta", text: "jong burger." },
      ]),
    );

    const { result } = renderHook(() => useOomPaulChat());

    await act(async () => {
      await result.current.sendMessage("Goeiedag");
    });

    expect(result.current.messages).toEqual([
      { role: "visitor", text: "Goeiedag" },
      { role: "oompaul", text: "Goeiedag, jong burger." },
    ]);
  });

  /**
   * The visitor's own line has to appear the moment they send it. Waiting for the first
   * token would leave the panel looking like it swallowed the message.
   */
  it("shows the visitor's message before any reply arrives", async () => {
    let release: (() => void) | undefined;
    const firstDelta = new Promise<void>((resolve) => {
      release = resolve;
    });

    streamChat.mockImplementation(async function* () {
      await firstDelta;
      yield { kind: "delta", text: "Goeiedag" };
    });

    const { result } = renderHook(() => useOomPaulChat());

    let turn: Promise<void>;
    act(() => {
      turn = result.current.sendMessage("Goeiedag");
    });

    await waitFor(() => {
      expect(result.current.messages).toEqual([{ role: "visitor", text: "Goeiedag" }]);
    });
    expect(result.current.isSending).toBe(true);

    await act(async () => {
      release!();
      await turn!;
    });

    expect(result.current.isSending).toBe(false);
  });

  it("sends the session id the server gave it back on the next turn", async () => {
    streamChat.mockImplementation(
      streamOf([
        { kind: "session", sessionId: SESSION },
        { kind: "delta", text: "Goeiedag" },
      ]),
    );

    const { result } = renderHook(() => useOomPaulChat());

    await act(async () => {
      await result.current.sendMessage("Eerste");
    });
    await act(async () => {
      await result.current.sendMessage("Tweede");
    });

    expect(streamChat.mock.calls[0][1]).toBeNull();
    expect(streamChat.mock.calls[1][1]).toBe(SESSION);
  });

  /**
   * A turn that dies halfway has still said something, and throwing it away would be a
   * worse answer than the partial one.
   */
  it("keeps the partial reply when the turn fails halfway", async () => {
    streamChat.mockImplementation(
      streamOf(
        [{ kind: "delta", text: "Goeiedag, " }],
        new ChatError("oompaul_failed", 200),
      ),
    );

    const { result } = renderHook(() => useOomPaulChat());

    await act(async () => {
      await result.current.sendMessage("Goeiedag");
    });

    expect(result.current.messages).toEqual([
      { role: "visitor", text: "Goeiedag" },
      { role: "oompaul", text: "Goeiedag, " },
    ]);
    expect(result.current.error).toBeTruthy();
    expect(result.current.isSending).toBe(false);
  });

  /**
   * A refusal before any text leaves no half-written reply behind — an empty grey
   * bubble under the question would read as Oom Paul saying nothing on purpose.
   */
  it("leaves no empty reply when the turn fails before any text", async () => {
    streamChat.mockImplementation(
      streamOf([], new ChatError("oompaul_unavailable", 503, "Oom Paul is nie beskikbaar nie.")),
    );

    const { result } = renderHook(() => useOomPaulChat());

    await act(async () => {
      await result.current.sendMessage("Goeiedag");
    });

    expect(result.current.messages).toEqual([{ role: "visitor", text: "Goeiedag" }]);
    expect(result.current.error).toBe("Oom Paul is nie beskikbaar nie.");
  });

  it("ignores a blank message", async () => {
    const { result } = renderHook(() => useOomPaulChat());

    await act(async () => {
      await result.current.sendMessage("   ");
    });

    expect(streamChat).not.toHaveBeenCalled();
    expect(result.current.messages).toEqual([]);
  });

  /**
   * Every turn is a billed model call, so a double-tap on Send must not buy two.
   */
  it("ignores a second turn while one is still streaming", async () => {
    let release: (() => void) | undefined;
    const firstDelta = new Promise<void>((resolve) => {
      release = resolve;
    });

    streamChat.mockImplementation(async function* () {
      await firstDelta;
      yield { kind: "delta", text: "Goeiedag" };
    });

    const { result } = renderHook(() => useOomPaulChat());

    let turn: Promise<void>;
    act(() => {
      turn = result.current.sendMessage("Eerste");
    });
    await waitFor(() => expect(result.current.isSending).toBe(true));

    await act(async () => {
      await result.current.sendMessage("Tweede");
    });

    expect(streamChat).toHaveBeenCalledTimes(1);

    await act(async () => {
      release!();
      await turn!;
    });
  });
});

describe("useOomPaulChat waiting for the first token", () => {
  /**
   * Two different questions, and the widget asks both: "may I send another turn" stays
   * true for the whole stream, while "is Oom Paul still thinking" has to stop the moment
   * he starts talking — otherwise the panel shows a thinking notice underneath the
   * sentence he is visibly writing.
   */
  it("stops awaiting once the first delta lands, while the turn is still sending", async () => {
    let releaseSecond: (() => void) | undefined;
    const secondDelta = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });

    streamChat.mockImplementation(async function* () {
      yield { kind: "delta", text: "Goeie" };
      await secondDelta;
      yield { kind: "delta", text: "dag" };
    });

    const { result } = renderHook(() => useOomPaulChat());

    let turn: Promise<void>;
    act(() => {
      turn = result.current.sendMessage("Goeiedag");
    });

    await waitFor(() => expect(result.current.isAwaitingReply).toBe(false));
    expect(result.current.isSending).toBe(true);

    await act(async () => {
      releaseSecond!();
      await turn!;
    });

    expect(result.current.isSending).toBe(false);
  });

  it("awaits a reply from the moment the turn is sent", async () => {
    let release: (() => void) | undefined;
    const firstDelta = new Promise<void>((resolve) => {
      release = resolve;
    });

    streamChat.mockImplementation(async function* () {
      await firstDelta;
      yield { kind: "delta", text: "Goeiedag" };
    });

    const { result } = renderHook(() => useOomPaulChat());

    let turn: Promise<void>;
    act(() => {
      turn = result.current.sendMessage("Goeiedag");
    });

    await waitFor(() => expect(result.current.isAwaitingReply).toBe(true));

    await act(async () => {
      release!();
      await turn!;
    });

    expect(result.current.isAwaitingReply).toBe(false);
  });

  /**
   * A refusal arrives with no delta at all, so nothing else would ever clear the notice
   * and it would sit there under the error message.
   */
  it("stops awaiting when the turn fails before any text", async () => {
    streamChat.mockImplementation(streamOf([], new ChatError("oompaul_unavailable", 503, "Weg.")));

    const { result } = renderHook(() => useOomPaulChat());

    await act(async () => {
      await result.current.sendMessage("Goeiedag");
    });

    expect(result.current.isAwaitingReply).toBe(false);
    expect(result.current.isSending).toBe(false);
  });
});
