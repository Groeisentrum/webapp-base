import { create } from "zustand";
import type { AuthState } from "@/shared/interfaces/AuthState";

/**
 * Global session state. Reach for Zustand only for state read from several unrelated
 * places on the page, as this is (see also `useDagbeplannerStore`) — everything else
 * stays local component state or server state held by React Query.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  setSession: (user) =>
    set({ user, isAuthenticated: true, isInitialized: true }),
  clearAuth: () =>
    set({ user: null, isAuthenticated: false, isInitialized: true }),
  setInitialized: (value) => set({ isInitialized: value }),
}));
