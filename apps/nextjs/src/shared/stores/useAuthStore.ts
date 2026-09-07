import { create } from "zustand";
import type { AuthState } from "@/shared/interfaces/AuthState";

/**
 * Global session state. Deliberately the only Zustand store in the app — everything
 * else is either local component state or server state held by React Query.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  setSession: (user) => set({ user, isAuthenticated: true, isInitialized: true }),
  clearAuth: () => set({ user: null, isAuthenticated: false, isInitialized: true }),
  setInitialized: (value) => set({ isInitialized: value }),
}));
