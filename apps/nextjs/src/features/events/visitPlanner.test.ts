import { expect, it } from "vitest";
import {
  emptyPreferences,
  matchesVisit,
  preferencesQuery,
  readPreferences,
} from "./visitPreferences";
import type { VisitorEvent } from "./eventModel";
const event: VisitorEvent = {
  id: "exhibition",
  title: "Kuns",
  description: "",
  body: "",
  category: "Kuns & kultuur",
  image: null,
  start: "2026-09-19T00:00:00+02:00",
  end: "2026-09-25T23:59:59+02:00",
  recurring: false,
  schedule: "",
  venue: "",
  priceLabel: "",
  facts: [],
  bookingUrl: null,
};
it("includes a multi-day event when any day overlaps, including its last day", () => {
  expect(
    matchesVisit(event, {
      ...emptyPreferences,
      from: "2026-09-25",
      to: "2026-09-27",
    }),
  ).toBe(true);
  expect(matchesVisit(event, { ...emptyPreferences, from: "2026-09-26" })).toBe(
    false,
  );
});
it("matches recurring published weekdays without assuming inventory", () => {
  const recurring = { ...event, recurring: true, weekdays: [5, 6] };
  expect(
    matchesVisit(recurring, { ...emptyPreferences, from: "2026-09-24" }),
  ).toBe(false);
  expect(
    matchesVisit(recurring, {
      ...emptyPreferences,
      from: "2026-09-24",
      to: "2026-09-26",
    }),
  ).toBe(true);
  expect(
    matchesVisit(
      { ...recurring, weekdays: undefined },
      { ...emptyPreferences, from: "2026-09-24" },
    ),
  ).toBe(true);
});
it("applies known group limits and OR-selected tags, leaving unknown limits visible", () => {
  const preferences = {
    ...emptyPreferences,
    people: 6,
    tags: ["Feeste", "Kuns & kultuur"],
  };
  expect(matchesVisit(event, preferences)).toBe(true);
  expect(
    matchesVisit({ ...event, groupSize: { min: 3, max: 5 } }, preferences),
  ).toBe(false);
  expect(matchesVisit(event, { ...preferences, tags: ["Teater"] })).toBe(false);
});
it("roundtrips submitted preferences and ignores malformed dates and group sizes", () => {
  const preferences = {
    ...emptyPreferences,
    people: 4,
    from: "2026-09-24",
    to: "2026-09-26",
    tags: ["Kuns & kultuur", "Feeste"],
  };
  expect(
    readPreferences(Object.fromEntries(preferencesQuery(preferences))),
  ).toEqual(preferences);
  expect(
    readPreferences({ van: "2026-02-31", mense: "-2", belang: "null" }),
  ).toEqual(emptyPreferences);
});
