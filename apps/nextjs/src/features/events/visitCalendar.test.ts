import { expect, it } from "vitest";
import { visitCalendar } from "./visitCalendar";
import type { VisitorEvent } from "./eventModel";

const event: VisitorEvent = {
  id: "theatre",
  title: "Teater, musiek; stories",
  description: "",
  body: "",
  category: "Teater",
  image: null,
  start: null,
  end: null,
  recurring: true,
  schedule: "",
  venue: "Museum",
  priceLabel: "",
  facts: [],
  bookingUrl: null,
  durationMinutes: 90,
};
it("exports the selected South African session as UTC with the correct duration and tentative status", () => {
  const result = visitCalendar(
    event,
    "2026-09-25T09:00:00+02:00",
    "PLAN-123",
    new Date("2026-09-18T10:00:00Z"),
  )!;
  expect(result).toContain("DTSTART:20260925T070000Z");
  expect(result).toContain("DTEND:20260925T083000Z");
  expect(result).toContain("STATUS:TENTATIVE");
  expect(result).toContain("Teater\\, musiek\\; stories");
});
it("does not invent a session for an undated experience", () => {
  expect(visitCalendar(event, null, "PLAN-123", new Date())).toBeNull();
});
it("folds Unicode safely and retains valid physical line lengths", () => {
  const result = visitCalendar(
    { ...event, title: "é".repeat(100) },
    "2026-09-25T09:00:00+02:00",
    "PLAN-123",
    new Date(),
  )!;
  expect(
    result
      .split("\r\n")
      .every((line) => new TextEncoder().encode(line).length <= 75),
  ).toBe(true);
  expect(result.replace(/\r\n /g, "")).toContain("é".repeat(100));
});
