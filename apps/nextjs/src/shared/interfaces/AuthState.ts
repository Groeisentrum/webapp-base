/** The signed-in user as hydrated from the session endpoint. */
export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  entityId: string | null;
  dataHolderId: string | null;
};

export type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /**
   * False until hydration has finished. Protected routes must wait for this before
   * deciding to redirect, otherwise a signed-in user is bounced on every reload.
   */
  isInitialized: boolean;
  setSession: (user: AuthUser) => void;
  clearAuth: () => void;
  setInitialized: (value: boolean) => void;
};

export type SessionResponse = {
  authenticated: boolean;
  user: AuthUser | null;
  exp?: number | null;
};
