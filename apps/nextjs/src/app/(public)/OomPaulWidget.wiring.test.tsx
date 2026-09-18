import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { OomPaulMessage } from "@/shared/hooks/useOomPaulChat";

const useOomPaulChat = vi.fn();

vi.mock("@/shared/hooks/useOomPaulChat", () => ({
  useOomPaulChat: () => useOomPaulChat(),
}));

const { OomPaulWidget } = await import("@/app/(public)/OomPaulWidget");

/**
 * The panel has two states that look alike from the hook and very different on screen:
 * waiting for Oom Paul to start, and watching him write. These pin which notice belongs
 * to which, and that the composer stays shut for both.
 */
// jsdom has no layout, so the panel's scroll-to-bottom would throw before a single
// assertion ran. Nothing here is testing scrolling.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Vitest runs without globals here, so Testing Library never registers its own
// afterEach — without this the previous test's panel is still in the document and
// every query matches twice.
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function stubChat(overrides: Partial<ReturnType<typeof chatState>> = {}) {
  useOomPaulChat.mockReturnValue({ ...chatState(), ...overrides });
}

function chatState() {
  return {
    messages: [] as OomPaulMessage[],
    isOpen: true,
    setIsOpen: vi.fn(),
    sendMessage: vi.fn(),
    isSending: false,
    isAwaitingReply: false,
    error: null as string | null,
  };
}

describe("OomPaulWidget", () => {
  it("says Oom Paul is thinking while the turn has produced nothing yet", () => {
    stubChat({
      messages: [{ role: "visitor", text: "Goeiedag" }],
      isSending: true,
      isAwaitingReply: true,
    });

    render(<OomPaulWidget />);

    expect(screen.getByRole("status").textContent).toMatch(/dink/i);
  });

  /**
   * Once the words are arriving, the reply itself is the progress indicator. Leaving the
   * notice up would tell the visitor he is still thinking about the sentence they can
   * already read.
   */
  it("drops the thinking notice once the reply starts arriving", () => {
    stubChat({
      messages: [
        { role: "visitor", text: "Goeiedag" },
        { role: "oompaul", text: "Goeiedag, jong" },
      ],
      isSending: true,
      isAwaitingReply: false,
    });

    render(<OomPaulWidget />);

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("Goeiedag, jong")).toBeTruthy();
  });

  /**
   * Every turn is a billed model call, so the composer stays shut for the whole stream,
   * not just the part before the first word.
   */
  it("keeps the composer closed for the whole turn, notice or not", () => {
    stubChat({
      messages: [
        { role: "visitor", text: "Goeiedag" },
        { role: "oompaul", text: "Goeiedag, jong" },
      ],
      isSending: true,
      isAwaitingReply: false,
    });

    render(<OomPaulWidget />);

    expect((screen.getByPlaceholderText(/Skryf/i) as HTMLTextAreaElement).disabled).toBe(true);
    expect((screen.getByLabelText("Stuur") as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows a failed turn as an alert rather than a status", () => {
    stubChat({
      messages: [{ role: "visitor", text: "Goeiedag" }],
      error: "Oom Paul is nie beskikbaar nie.",
    });

    render(<OomPaulWidget />);

    expect(screen.getByRole("alert").textContent).toContain("Oom Paul is nie beskikbaar nie.");
    expect(screen.queryByRole("status")).toBeNull();
  });
});
