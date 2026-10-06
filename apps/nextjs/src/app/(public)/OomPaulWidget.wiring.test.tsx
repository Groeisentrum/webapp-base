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

describe("OomPaulWidget keyboard and assistive technology", () => {
  /**
   * PublicShell is rendered fresh on every public page rather than through a shared
   * layout, so the widget mounts on every navigation. Focusing the launcher on mount
   * therefore stole focus from the page on every single page load, and moved the
   * viewport to the bottom-right corner with it.
   */
  it("does not take focus when the page loads", () => {
    stubChat({ isOpen: false });

    render(<OomPaulWidget />);

    expect(document.activeElement).toBe(document.body);
  });

  /**
   * The panel stays mounted when closed so it can animate, which left its textarea and
   * both its buttons in the tab order behind an aria-hidden container — focusable but
   * invisible and unannounced. That is the axe "aria-hidden-focus" violation, and for a
   * keyboard visitor it is three tab stops into nothing.
   */
  it("takes the closed panel out of the tab order entirely", () => {
    stubChat({ isOpen: false });

    const { container } = render(<OomPaulWidget />);
    const panel = container.querySelector('[role="dialog"]')!;

    expect(panel.hasAttribute("inert")).toBe(true);
  });

  it("puts the open panel back in the tab order and takes the launcher out", () => {
    stubChat({ isOpen: true });

    const { container } = render(<OomPaulWidget />);

    expect(container.querySelector('[role="dialog"]')!.hasAttribute("inert")).toBe(false);
    expect(screen.getByRole("button", { name: "Gesels met Oom Paul" }).hasAttribute("inert")).toBe(
      true,
    );
  });

  /**
   * A reply that arrives a token at a time is invisible to a screen reader: the text is
   * painted, but nothing announces it. Announcing every token instead would interrupt
   * the reader on each one. The finished reply is announced once, politely.
   */
  it("announces the finished reply once, not every token", () => {
    stubChat({
      messages: [
        { role: "visitor", text: "Goeiedag" },
        { role: "oompaul", text: "Goeiedag, jong burger." },
      ],
      isSending: false,
      isAwaitingReply: false,
    });

    const { container } = render(<OomPaulWidget />);
    const live = container.querySelector('[data-testid="oompaul-announcer"]')!;

    expect(live.getAttribute("aria-live")).toBe("polite");
    expect(live.textContent).toBe("Goeiedag, jong burger.");
  });

  it("announces nothing while the reply is still being written", () => {
    stubChat({
      messages: [
        { role: "visitor", text: "Goeiedag" },
        { role: "oompaul", text: "Goeie" },
      ],
      isSending: true,
      isAwaitingReply: false,
    });

    const { container } = render(<OomPaulWidget />);

    expect(container.querySelector('[data-testid="oompaul-announcer"]')!.textContent).toBe("");
  });

  /**
   * aria-modal tells assistive technology the rest of the page is inert. Nothing here
   * traps focus, and above `sm` the panel is a docked corner panel that deliberately
   * leaves the page usable — so the claim was false at every breakpoint.
   */
  it("does not claim to be modal when nothing traps focus", () => {
    stubChat({ isOpen: true });

    const { container } = render(<OomPaulWidget />);

    expect(container.querySelector('[role="dialog"]')!.hasAttribute("aria-modal")).toBe(false);
  });
});
