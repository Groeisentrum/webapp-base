import type { SessionResponse } from "@/shared/interfaces/AuthState";

/**
 * Talks to this app's own auth routes. Credentials go to the server, which exchanges
 * them with SkaapHond and stores tokens in httpOnly cookies — no token ever reaches
 * this layer.
 */
export async function login(username: string, password: string): Promise<void> {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      (payload as { message?: string } | null)?.message ??
      "Kon nie aanmeld nie. Kontroleer jou besonderhede.";

    throw new Error(message);
  }
}

export async function getSession(): Promise<SessionResponse> {
  const response = await fetch("/api/session", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    return { authenticated: false, user: null };
  }

  return (await response.json()) as SessionResponse;
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/logout", { method: "POST", credentials: "include" });
  } catch {
    // Sign-out proceeds locally regardless; the caller clears client state next.
  }
}
