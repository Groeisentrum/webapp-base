"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { logout } from "@/shared/services/authService";
import { useAuthStore } from "@/shared/stores/useAuthStore";

/**
 * Sign in, or sign out again.
 *
 * Renders nothing until the session has hydrated. A "Teken aan" link that flips to
 * "Teken uit" a moment later invites a mis-tap, and the header is the one place on
 * the page where that matters.
 */
export function SessionMenu({ language }: { language: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  if (!isInitialized) {
    return <span className="min-h-11 w-16" aria-hidden="true" />;
  }

  if (!isAuthenticated) {
    return (
      <Link
        href={`/aanmeld?taal=${encodeURIComponent(language)}`}
        className="inline-flex min-h-11 items-center rounded-md px-2.5 text-sm text-(--text-secondary) hover:text-(--text-primary)"
      >
        Teken aan
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(() => {
          void logout().finally(() => {
            clearAuth();
            router.refresh();
          });
        })
      }
      className="inline-flex min-h-11 items-center rounded-md px-2.5 text-sm text-(--text-secondary) hover:text-(--text-primary)"
    >
      Teken uit
    </button>
  );
}
