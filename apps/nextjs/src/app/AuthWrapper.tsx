"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthRefresh } from "@/shared/hooks/useAuthRefresh";
import { registerLogoutHandler } from "@/shared/lib/fetchWithAutoLogout";
import { logout } from "@/shared/services/authService";
import { useAuthStore } from "@/shared/stores/useAuthStore";

/**
 * Hydrates the session and wires the automatic sign-out path.
 *
 * Rendering is never blocked on hydration: the public site must stay visible to
 * anonymous visitors. Protected routes wait on `isInitialized` themselves.
 */
export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useAuthRefresh();

  useEffect(() => {
    registerLogoutHandler(() => {
      void logout().finally(() => {
        clearAuth();
        router.push("/aanmeld");
      });
    });
  }, [clearAuth, router]);

  return <>{children}</>;
}
