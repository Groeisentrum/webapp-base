import { describe, expect, it } from "vitest";
import { canManageContent, hasAnyKnownRole, isAdmin, isClient } from "@/shared/lib/authRoles";
import type { AuthUser } from "@/shared/interfaces/AuthState";

function buildUser(roles: string[]): AuthUser {
  return {
    id: "user-1",
    email: "iemand@voorbeeld.co.za",
    name: null,
    roles,
    entityId: null,
    dataHolderId: null,
  };
}

describe("isAdmin", () => {
  it("recognises the Admin role", () => {
    expect(isAdmin(buildUser(["Admin"]))).toBe(true);
  });

  it("ignores case, since claim casing varies by token version", () => {
    expect(isAdmin(buildUser(["admin"]))).toBe(true);
  });

  it("rejects a content editor", () => {
    expect(isAdmin(buildUser(["Content"]))).toBe(false);
  });

  it("rejects a signed-out user", () => {
    expect(isAdmin(null)).toBe(false);
  });
});

describe("canManageContent", () => {
  it("allows the Content role", () => {
    expect(canManageContent(buildUser(["Content"]))).toBe(true);
  });

  it("allows an Admin, who must not be locked out of content", () => {
    expect(canManageContent(buildUser(["Admin"]))).toBe(true);
  });

  it("rejects an unrelated role", () => {
    expect(canManageContent(buildUser(["Broker"]))).toBe(false);
  });

  it("rejects a signed-out user", () => {
    expect(canManageContent(null)).toBe(false);
  });
});

describe("isClient", () => {
  it("recognises a registered visitor", () => {
    expect(isClient(buildUser(["Client"]))).toBe(true);
  });

  /**
   * A registered visitor must never reach the admin area — that is the whole point
   * of the role being separate.
   */
  it("does not grant the admin area", () => {
    const client = buildUser(["Client"]);

    expect(isAdmin(client)).toBe(false);
    expect(canManageContent(client)).toBe(false);
  });
});

describe("hasAnyKnownRole", () => {
  it("is false for a token carrying only unrelated roles", () => {
    expect(hasAnyKnownRole(buildUser(["Broker", "Auditor"]))).toBe(false);
  });

  it("is true when one recognised role is present", () => {
    expect(hasAnyKnownRole(buildUser(["Broker", "Content"]))).toBe(true);
  });

  it("counts a registered visitor as known", () => {
    expect(hasAnyKnownRole(buildUser(["Client"]))).toBe(true);
  });
});
