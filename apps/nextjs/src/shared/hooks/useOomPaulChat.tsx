"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sendOomPaulMessage } from "@/shared/services/oomPaulService";

export type OomPaulMessage = {
  role: "visitor" | "oompaul";
  text: string;
};

type StoredChatState = {
  sessionId: string | null;
  messages: OomPaulMessage[];
  isOpen: boolean;
};

const STORAGE_KEY = "oompaul-chat";
const EMPTY_STATE: StoredChatState = {
  sessionId: null,
  messages: [],
  isOpen: false,
};
const GENERIC_ERROR_MESSAGE =
  "Jammer, iets het verkeerd geloop. Probeer asseblief weer.";

function readStoredState(): StoredChatState {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredChatState) : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

function writeStoredState(state: StoredChatState): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing or a full quota leaves the conversation unsaved for the next
    // navigation, which is a worse experience but never a broken one.
  }
}

/**
 * Oom Paul's conversation state, persisted to sessionStorage for the tab's lifetime.
 *
 * Every public page calls `PublicShell` fresh rather than sharing a Next.js layout,
 * so the widget remounts on every navigation — without this, a visitor's
 * conversation would vanish the moment they followed a link.
 *
 * Starts from an empty state on every render so the server and the client agree on
 * the first paint; the real, possibly non-empty state is read right after mount.
 */
export function useOomPaulChat() {
  const [state, setState] = useState<StoredChatState>(EMPTY_STATE);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isHydrated = useRef(false);

  useEffect(() => {
    // A hard refresh mid-conversation re-runs SSR against the same, now-populated
    // sessionStorage, so reading it in the initializer would fight hydration. Reading
    // it here instead means the first paint always matches the server's empty one.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readStoredState());
    isHydrated.current = true;
  }, []);

  useEffect(() => {
    if (!isHydrated.current) return;
    writeStoredState(state);
  }, [state]);

  const setIsOpen = useCallback((isOpen: boolean) => {
    setState((current) => ({ ...current, isOpen }));
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      setError(null);
      setState((current) => ({
        ...current,
        messages: [...current.messages, { role: "visitor", text: trimmed }],
      }));
      setIsSending(true);

      try {
        const response = await sendOomPaulMessage(trimmed, state.sessionId);

        setState((current) => ({
          ...current,
          sessionId: response.sessionId,
          messages: [
            ...current.messages,
            { role: "oompaul", text: response.reply },
          ],
        }));
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : GENERIC_ERROR_MESSAGE,
        );
      } finally {
        setIsSending(false);
      }
    },
    [isSending, state.sessionId],
  );

  return {
    messages: state.messages,
    isOpen: state.isOpen,
    setIsOpen,
    sendMessage,
    isSending,
    error,
  };
}
