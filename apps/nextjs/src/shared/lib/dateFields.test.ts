import { describe, expect, it } from "vitest";
import { fromDateTimeLocal, toDateTimeLocal } from "@/shared/lib/dateFields";

describe("datetime-local conversion", () => {
  it("round-trips a timestamp without drifting", () => {
    const original = new Date(2026, 2, 15, 14, 30).toISOString();

    const roundTripped = fromDateTimeLocal(toDateTimeLocal(original));

    expect(roundTripped).toBe(original);
  });

  it("maps an empty field to null rather than an invalid date", () => {
    expect(fromDateTimeLocal("")).toBeNull();
  });

  it("maps a null timestamp to an empty field", () => {
    expect(toDateTimeLocal(null)).toBe("");
  });

  it("ignores an unparseable timestamp", () => {
    expect(toDateTimeLocal("not-a-date")).toBe("");
    expect(fromDateTimeLocal("not-a-date")).toBeNull();
  });

  it("zero-pads single-digit months and days", () => {
    const value = toDateTimeLocal(new Date(2026, 0, 5, 9, 7).toISOString());

    expect(value).toBe("2026-01-05T09:07");
  });
});
