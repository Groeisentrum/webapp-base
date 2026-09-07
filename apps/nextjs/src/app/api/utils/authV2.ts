import { NextRequest } from "next/server";
import { AUTH_COOKIE_NAMES, getCookieValue } from "@/app/api/utils/authCookies";
import { getSkaaphondBaseUrl } from "@/app/api/utils/serviceUrls";

const getAuthV2Base = () => `${getSkaaphondBaseUrl()}/auth/v2`;

const inFlightRefreshes = new Map<string, Promise<AuthTokens | null>>();
const recentRefreshes = new Map<string, { expiresAt: number; tokens: AuthTokens }>();
const RECENT_REFRESH_TTL_MS = 30_000;

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export function getAccessToken(req: NextRequest): string | null {
  return getCookieValue(req, AUTH_COOKIE_NAMES.accessToken);
}

export function getRefreshToken(req: NextRequest): string | null {
  return getCookieValue(req, AUTH_COOKIE_NAMES.refreshToken);
}

/**
 * Exchanges a refresh token for a rotated pair.
 *
 * SkaapHond rotates refresh tokens, so a token is only valid once. Two guards keep
 * concurrent requests from invalidating each other and signing the user out:
 * in-flight calls share one promise, and the result stays addressable by the spent
 * token for a short window afterwards.
 */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
  const normalizedRefreshToken = refreshToken.trim();
  if (!normalizedRefreshToken) {
    return null;
  }

  const recentRefresh = getRecentRefresh(normalizedRefreshToken);
  if (recentRefresh) {
    return recentRefresh;
  }

  const existingRefresh = inFlightRefreshes.get(normalizedRefreshToken);
  if (existingRefresh) {
    return existingRefresh;
  }

  const refreshPromise = (async (): Promise<AuthTokens | null> => {
    const response = await fetch(`${getAuthV2Base()}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: normalizedRefreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return null;
    }

    const accessToken = (data as { token?: string } | null | undefined)?.token;
    const rotatedRefreshToken = (data as { refreshToken?: string } | null | undefined)?.refreshToken;

    if (!accessToken || !rotatedRefreshToken) {
      return null;
    }

    const tokens = { accessToken, refreshToken: rotatedRefreshToken };
    storeRecentRefresh(normalizedRefreshToken, tokens);

    return tokens;
  })();

  inFlightRefreshes.set(normalizedRefreshToken, refreshPromise);

  try {
    return await refreshPromise;
  } finally {
    inFlightRefreshes.delete(normalizedRefreshToken);
  }
}

function getRecentRefresh(refreshToken: string): AuthTokens | null {
  const cached = recentRefreshes.get(refreshToken);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    recentRefreshes.delete(refreshToken);
    return null;
  }

  return cached.tokens;
}

function storeRecentRefresh(previousRefreshToken: string, tokens: AuthTokens): void {
  const now = Date.now();

  for (const [key, value] of recentRefreshes) {
    if (value.expiresAt <= now) {
      recentRefreshes.delete(key);
    }
  }

  recentRefreshes.set(previousRefreshToken, {
    expiresAt: now + RECENT_REFRESH_TTL_MS,
    tokens,
  });
}
