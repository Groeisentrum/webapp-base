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
  const { messages, isOpen, setIsOpen, sendMessage, isSending, error } =
    useOomPaulChat();
  const [draft, setDraft] = useState("");
  const listEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
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

  useEffect(() => {
    if (!isOpen) return;
    listEndRef.current?.scrollIntoView({ block: "end" });
  }, [isOpen, messages.length, isSending]);

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
        aria-hidden={isOpen}
        tabIndex={isOpen ? -1 : 0}
        className={cn(
          "fixed right-4 bottom-4 z-40 flex h-14 w-14 items-center justify-center rounded-full",
          "bg-(--brand-accent) text-(--text-inverse) shadow-lg hover:opacity-90",
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
        aria-modal="true"
        aria-label="Gesels met Oom Paul"
        aria-hidden={!isOpen}
        className={cn(
          "fixed inset-0 z-50 flex flex-col bg-(--panel-bg)",
          "sm:inset-auto sm:right-6 sm:bottom-6 sm:h-[32rem] sm:w-96 sm:rounded-lg sm:border sm:border-(--panel-border) sm:shadow-xl",
          "motion-safe:transition motion-safe:duration-200 motion-safe:ease-out",
          isOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0 sm:translate-y-2",
        )}
      >
        <header className="flex items-center gap-3 border-b border-(--panel-border) px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--brand-accent) text-(--text-inverse)">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-(--text-primary)">
              Oom Paul
            </p>
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

          {isSending && (
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

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="flex items-end gap-2 border-t border-(--panel-border) p-3"
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
