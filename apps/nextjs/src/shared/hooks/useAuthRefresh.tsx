"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import { getSession } from "@/shared/services/authService";

/**
 * Hydrates the session once per page load.
 *
 * Tokens live in httpOnly cookies, so client state is empty on every load and must be
 * rebuilt from the session endpoint. Until that finishes `isInitialized` stays false
 * and protected routes hold their redirect decision.
 */
export function useAuthRefresh(): void {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const setSession = useAuthStore((state) => state.setSession);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    if (isInitialized) {
      return;
    }

    let cancelled = false;

    const hydrate = async () => {
      try {
        const session = await getSession();

        if (cancelled) return;

        if (session.authenticated && session.user) {
          setSession(session.user);
        } else {
          clearAuth();
        }
      } catch {
        if (!cancelled) {
          clearAuth();
        }
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [isInitialized, setSession, clearAuth]);
}
