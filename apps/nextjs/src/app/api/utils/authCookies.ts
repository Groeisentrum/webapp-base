import type { NextRequest, NextResponse } from "next/server";

// Browsers cap a single cookie near 4KB. SkaapHond tokens carrying many claims
// exceed that, so anything longer is split across numbered cookies and rejoined on read.
const CHUNK_SIZE = 3500;
const MAX_CHUNKS = 20;

export const AUTH_COOKIE_NAMES = {
  accessToken: "webapp.accessToken",
  refreshToken: "webapp.refreshToken",
  friendlyName: "webapp.friendlyName",
} as const;

const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60, // 1 hour
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

export function getCookieValue(req: NextRequest, baseName: string): string | null {
  let value = req.cookies.get(baseName)?.value;

  if (!value) {
    const firstChunk = req.cookies.get(`${baseName}.0`)?.value;
    if (firstChunk) {
      value = "";
      for (let i = 0; i < MAX_CHUNKS; i++) {
        const chunk = req.cookies.get(`${baseName}.${i}`)?.value;
        if (!chunk) break;
        value += chunk;
      }
    }
  }

  return value ?? null;
}

export function setAuthCookies(
  res: NextResponse,
  tokens: { accessToken: string; refreshToken: string },
): void {
  try {
    setCookieValue(res, AUTH_COOKIE_NAMES.accessToken, tokens.accessToken, accessCookieOptions);
    setCookieValue(res, AUTH_COOKIE_NAMES.refreshToken, tokens.refreshToken, refreshCookieOptions);
  } catch {
    // A half-written token pair would authenticate nobody and confuse the next read.
    clearAuthCookies(res);
    throw new Error("Auth token exceeds supported cookie size limits.");
  }
}

export function setFriendlyNameCookie(res: NextResponse, friendlyName: string): void {
  res.cookies.set(AUTH_COOKIE_NAMES.friendlyName, friendlyName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function getFriendlyName(req: NextRequest): string | null {
  return req.cookies.get(AUTH_COOKIE_NAMES.friendlyName)?.value ?? null;
}

export function clearAuthCookies(res: NextResponse): void {
  const baseNames = [
    AUTH_COOKIE_NAMES.accessToken,
    AUTH_COOKIE_NAMES.refreshToken,
    AUTH_COOKIE_NAMES.friendlyName,
  ];

  for (const name of baseNames) {
    clearCookieByName(res, name);
  }
}

function clearCookieByName(res: NextResponse, baseName: string): void {
  res.cookies.delete(baseName);
  for (let i = 0; i < MAX_CHUNKS; i++) {
    res.cookies.delete(`${baseName}.${i}`);
  }
}

function setCookieValue(
  res: NextResponse,
  baseName: string,
  value: string,
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax";
    path: string;
    maxAge: number;
  },
): void {
  // Clear first so a shorter replacement cannot leave stale trailing chunks behind,
  // which would otherwise be rejoined into a corrupt token.
  clearCookieByName(res, baseName);

  if (value.length <= CHUNK_SIZE) {
    res.cookies.set(baseName, value, options);
    return;
  }

  const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
  if (chunkCount > MAX_CHUNKS) {
    clearCookieByName(res, baseName);
    throw new RangeError(`${baseName} exceeds cookie chunk limit (${chunkCount}/${MAX_CHUNKS}).`);
  }

  for (let i = 0; i < chunkCount; i++) {
    const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    res.cookies.set(`${baseName}.${i}`, chunk, options);
  }
}
