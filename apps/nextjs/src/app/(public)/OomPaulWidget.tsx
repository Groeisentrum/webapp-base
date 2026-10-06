"use client";

import { useEffect, useRef, useState } from "react";
import { Send, UserRound, X } from "lucide-react";
import { Button } from "@/shared/components/ui";
import { cn } from "@/shared/lib/cn";
import {
  useOomPaulChat,
  type OomPaulMessage,
} from "@/shared/hooks/useOomPaulChat";

/**
 * Site-wide chat widget, rendered from `PublicShell` so every public page gets it.
 *
 * Both the launcher and the panel stay mounted at all times and are shown or hidden
 * with an opacity/transform transition rather than conditional rendering, so opening
 * and closing animate instead of snapping — and `motion-reduce` visitors get an
 * instant switch instead.
 */
export function OomPaulWidget() {
  const { messages, isOpen, setIsOpen, sendMessage, isSending, isAwaitingReply, error } =
    useOomPaulChat();
  const [draft, setDraft] = useState("");
  const listEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  // PublicShell renders fresh on every public page rather than through a shared layout,
  // so this widget mounts on every navigation. Moving focus on mount therefore stole it
  // from the page each time, and dragged the viewport to the corner with it. Focus moves
  // only when the panel actually opens or closes.
  const wasOpen = useRef(isOpen);

  useEffect(() => {
    if (wasOpen.current === isOpen) return;
    wasOpen.current = isOpen;

    if (isOpen) {
      textareaRef.current?.focus();
    } else {
      launcherRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, setIsOpen]);

  // The streamed reply grows in place, so the message count stops changing after the
  // first token — following the text is what keeps the panel scrolled to the bottom
  // while the answer is still being written.
  const lastMessageText = messages[messages.length - 1]?.text;

  useEffect(() => {
    if (!isOpen) return;
    listEndRef.current?.scrollIntoView({ block: "end" });
  }, [isOpen, messages.length, lastMessageText, isAwaitingReply]);

  // A streamed reply is painted token by token, which a screen reader never hears. The
  // finished reply is announced once instead: announcing each token would interrupt the
  // reader on every one, and announcing nothing leaves the answer unread.
  const lastMessage = messages[messages.length - 1];
  const finishedReply =
    !isSending && !isAwaitingReply && lastMessage?.role === "oompaul"
      ? lastMessage.text
      : "";

  const submit = async () => {
    if (draft.trim().length === 0 || isSending) return;

    const text = draft;
    setDraft("");
    await sendMessage(text);
  };

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Gesels met Oom Paul"
        // inert takes it out of the tab order AND hides it from assistive technology.
        // aria-hidden alone left it focusable, which is the axe aria-hidden-focus failure.
        inert={isOpen}
        className={cn(
          // bottom-20 clears the docked bottom menu, which is fixed full-width at
          // bottom-0 on the same layer — the launcher was sitting on top of its links.
          "fixed right-4 bottom-20 z-40 flex h-14 w-14 items-center justify-center rounded-full",
          // Brand primary, not accent: this is a primary action, and the accent is a
          // light brass on several client palettes that fails non-text contrast both
          // against the icon on it and against the page behind it.
          "bg-(--brand-primary) text-(--text-inverse) shadow-lg hover:opacity-90",
          "motion-safe:transition motion-safe:duration-200 motion-safe:ease-out",
          "sm:right-6 sm:bottom-6",
          isOpen
            ? "pointer-events-none scale-90 opacity-0"
            : "scale-100 opacity-100",
        )}
      >
        <UserRound className="h-7 w-7" aria-hidden="true" />
      </button>

      <div
        role="dialog"
        // Named by its own heading rather than a duplicate aria-label: the launcher is
        // already called "Gesels met Oom Paul", and two elements answering to one name
        // is ambiguous for anyone navigating by name.
        aria-labelledby="oompaul-panel-title"
        // No aria-modal: nothing traps focus, and above sm this is a docked corner panel
        // that deliberately leaves the rest of the page usable. Claiming modal would tell
        // assistive technology the page behind it is inert when it is not.
        inert={!isOpen}
        className={cn(
          "fixed inset-0 z-50 flex flex-col bg-(--panel-bg)",
          // Capped against the viewport as well as at 32rem: sm is a width breakpoint, so
          // a landscape phone would otherwise get a 512px panel in a 360px-tall window.
          "sm:inset-auto sm:right-6 sm:bottom-6 sm:h-[min(32rem,calc(100dvh-3rem))] sm:w-96 sm:rounded-lg sm:border sm:border-(--panel-border) sm:shadow-xl",
          "motion-safe:transition motion-safe:duration-200 motion-safe:ease-out",
          isOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0 sm:translate-y-2",
        )}
      >
        <header className="flex items-center gap-3 border-b border-(--panel-border) px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--brand-primary) text-(--text-inverse)">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <h2
              id="oompaul-panel-title"
              className="truncate text-sm font-semibold text-(--text-primary)"
            >
              Oom Paul
            </h2>
            <p className="truncate text-xs text-(--text-secondary)">
              Historiese uitbeelding van Paul Kruger
            </p>
          </div>

          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            aria-label="Maak toe"
            className="shrink-0 px-2"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <p className="text-sm text-(--text-secondary)">
              Groet! Vra gerus iets oor die Voortrekkermonument of my lewe.
            </p>
          )}

          {messages.map((message, index) => (
            <ChatBubble key={index} message={message} />
          ))}

          {/* Only while nothing has arrived: once the words are streaming, the reply
              itself is the progress indicator. */}
          {isAwaitingReply && (
            <p role="status" className="text-sm text-(--text-secondary)">
              Oom Paul dink...
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-(--state-danger)">
              {error}
            </p>
          )}

          <div ref={listEndRef} />
        </div>

        <p
          data-testid="oompaul-announcer"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {finishedReply}
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          // The extra bottom padding is the iOS home indicator; without it the composer
          // sits underneath it on a full-screen phone panel.
          className="flex items-end gap-2 border-t border-(--panel-border) p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3"
        >
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            rows={1}
            placeholder="Skryf 'n boodskap..."
            disabled={isSending}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-md border border-(--panel-border) bg-(--panel-bg) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-secondary)"
          />

          <Button
            type="submit"
            disabled={isSending || draft.trim().length === 0}
            aria-label="Stuur"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </form>
      </div>
    </>
  );
}

function ChatBubble({ message }: { message: OomPaulMessage }) {
  const isVisitor = message.role === "visitor";

  return (
    <div className={cn("flex", isVisitor ? "justify-end" : "justify-start")}>
      <p
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
          isVisitor
            ? "bg-(--brand-primary) text-(--text-inverse)"
            : "border border-(--panel-border) bg-(--page-bg) text-(--text-primary)",
        )}
      >
        {message.text}
      </p>
    </div>
  );
}
