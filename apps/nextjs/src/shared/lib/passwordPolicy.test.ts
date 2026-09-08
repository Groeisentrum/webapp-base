import { describe, expect, it } from "vitest";
import {
  MINIMUM_PASSWORD_LENGTH,
  isPasswordAcceptable,
} from "@/shared/lib/passwordPolicy";

/**
 * These cases mirror the C# PasswordPolicyTests exactly. The two sides must agree, or
 * a password accepted here is rejected upstream with a message that does not say why.
 */
describe("isPasswordAcceptable", () => {
  it.each(["Wagwoord1!", "Aa1!aaaa", "Langer-Wagwoord-2026!"])(
    "accepts %s",
    (password) => {
      expect(isPasswordAcceptable(password)).toBe(true);
    },
  );

  it.each([
    ["Aa1!aaa", "one character short"],
    ["wagwoord1!", "no uppercase"],
    ["WAGWOORD1!", "no lowercase"],
    ["Wagwoord!", "no digit"],
    ["Wagwoord1", "no special character"],
    ["", "empty"],
  ])("rejects %s (%s)", (password) => {
    expect(isPasswordAcceptable(password)).toBe(false);
  });

  it("accepts exactly the minimum length", () => {
    const password = "Aa1!aaaa";

    expect(password).toHaveLength(MINIMUM_PASSWORD_LENGTH);
    expect(isPasswordAcceptable(password)).toBe(true);
  });

  it.each(["Aa1 aaaa", "Aa1_aaaa", "Aa1€aaaa"])(
    "treats any non-alphanumeric as special: %s",
    (password) => {
      expect(isPasswordAcceptable(password)).toBe(true);
    },
  );
});
