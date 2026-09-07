/**
 * Reads claims out of a SkaapHond JWT.
 *
 * The payload is decoded, never verified, here — this is only used to shape the
 * session the browser sees. Every request that matters is authorised by the C# API
 * against the token's signature, so a tampered token buys nothing but a wrong name
 * on screen.
 */
export type JwtPayload = Record<string, unknown>;

export function decodeJwtPayload(token: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length < 2) {
    throw new Error("Invalid JWT format");
  }

  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const json = Buffer.from(padded, "base64").toString("utf8");

  return JSON.parse(json) as JwtPayload;
}

export function isExpired(payload: JwtPayload): boolean {
  const expiry = payload.exp;
  if (typeof expiry !== "number") {
    return false;
  }

  return expiry <= Math.floor(Date.now() / 1000);
}

/** Returns the first claim that holds a usable string, tolerating array and numeric values. */
export function firstNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === "string") {
          const trimmed = entry.trim();
          if (trimmed) return trimmed;
        }
      }
      continue;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

export function toNonEmptyStringArray(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return [String(value)];
  }

  return [];
}

/** SkaapHond spells the role claim three different ways depending on token version. */
export function extractRoles(payload: JwtPayload): string[] {
  return Array.from(
    new Set([
      ...toNonEmptyStringArray(payload.role),
      ...toNonEmptyStringArray(payload.roles),
      ...toNonEmptyStringArray(
        payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
      ),
    ]),
  );
}

export function extractUserId(payload: JwtPayload): string | null {
  return firstNonEmptyString(payload.sub, payload.nameid, payload.NameIdentifier);
}

export function extractEmail(payload: JwtPayload): string | null {
  return firstNonEmptyString(payload.email, payload.Email, payload.upn, payload.unique_name);
}
