import { describe, expect, it } from "vitest";
import {
  decodeJwtPayload,
  extractEmail,
  extractRoles,
  extractUserId,
  isExpired,
  type JwtPayload,
} from "@/app/api/utils/jwtClaims";

function buildToken(payload: Record<string, unknown>): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`;
}

describe("decodeJwtPayload", () => {
  it("decodes the payload segment", () => {
    const token = buildToken({ sub: "user-1", email: "iemand@voorbeeld.co.za" });

    expect(decodeJwtPayload(token)).toMatchObject({
      sub: "user-1",
      email: "iemand@voorbeeld.co.za",
    });
  });

  it("handles base64url payloads that need padding", () => {
    const token = buildToken({ sub: "abc", note: "padding-sensitive-value" });

    expect(() => decodeJwtPayload(token)).not.toThrow();
  });

  it("rejects a malformed token", () => {
    expect(() => decodeJwtPayload("not-a-jwt")).toThrow();
  });
});

describe("isExpired", () => {
  it("treats a past exp as expired", () => {
    const payload: JwtPayload = { exp: Math.floor(Date.now() / 1000) - 60 };

    expect(isExpired(payload)).toBe(true);
  });

  it("treats a future exp as valid", () => {
    const payload: JwtPayload = { exp: Math.floor(Date.now() / 1000) + 600 };

    expect(isExpired(payload)).toBe(false);
  });

  it("treats a missing exp as not expired", () => {
    expect(isExpired({})).toBe(false);
  });
});

describe("extractRoles", () => {
  it("reads the singular role claim", () => {
    expect(extractRoles({ role: "Admin" })).toEqual(["Admin"]);
  });

  it("reads the plural roles claim as an array", () => {
    expect(extractRoles({ roles: ["Admin", "Content"] })).toEqual(["Admin", "Content"]);
  });

  it("reads the schema-qualified role claim", () => {
    const payload = {
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "Content",
    };

    expect(extractRoles(payload)).toEqual(["Content"]);
  });

  it("merges every spelling without duplicating", () => {
    const payload = {
      role: "Admin",
      roles: ["Admin", "Content"],
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "Content",
    };

    expect(extractRoles(payload)).toEqual(["Admin", "Content"]);
  });

  it("returns nothing when no role claim is present", () => {
    expect(extractRoles({ sub: "user-1" })).toEqual([]);
  });

  it("discards blank entries", () => {
    expect(extractRoles({ roles: ["Admin", "", "  "] })).toEqual(["Admin"]);
  });
});

describe("extractUserId", () => {
  it("prefers sub", () => {
    expect(extractUserId({ sub: "a", nameid: "b" })).toBe("a");
  });

  it("falls back to nameid", () => {
    expect(extractUserId({ nameid: "b" })).toBe("b");
  });

  it("returns null when absent", () => {
    expect(extractUserId({})).toBeNull();
  });
});

describe("extractEmail", () => {
  it("accepts any of the spellings SkaapHond emits", () => {
    expect(extractEmail({ email: "a@b.co.za" })).toBe("a@b.co.za");
    expect(extractEmail({ Email: "c@d.co.za" })).toBe("c@d.co.za");
    expect(extractEmail({ upn: "e@f.co.za" })).toBe("e@f.co.za");
    expect(extractEmail({ unique_name: "g@h.co.za" })).toBe("g@h.co.za");
  });
});
