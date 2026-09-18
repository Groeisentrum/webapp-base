import { describe, expect, it } from "vitest";
import { AssetType, type PublicContent } from "@/shared/interfaces/Domain";
import {
  eventDate,
  safeWebUrl,
  ticketTotal,
  toVisitorEvent,
  upcomingEvents,
  type VisitorEvent,
} from "./eventModel";

const event = (
  id: string,
  start: string | null,
  end: string | null = null,
  recurring = false,
): VisitorEvent => ({
  id,
  title: id,
  start,
  end,
  recurring,
  description: "",
  body: "",
  image: null,
  category: "Gebeure",
  schedule: "Weekliks",
  venue: "",
  priceLabel: "",
  facts: [],
  bookingUrl: null,
});

describe("event discovery", () => {
  it("includes ongoing multi-day events and distant future events in chronological order", () => {
    const events = [
      event("future", "2030-01-01T10:00:00Z"),
      event("past", "2026-09-01T10:00:00Z"),
      event("ongoing", "2026-09-17T10:00:00Z", "2026-09-25T10:00:00Z"),
      event("recurring", null, null, true),
    ];
    expect(
      upcomingEvents(events, new Date("2026-09-18T10:00:00Z")).map(
        (item) => item.id,
      ),
    ).toEqual(["ongoing", "future", "recurring"]);
    expect(events).toHaveLength(4); // Discovery does not unpublish the archived detail.
  });
  it("does not invent dates for undated one-off content", () => {
    expect(upcomingEvents([event("undated", null)], new Date())).toEqual([]);
  });
  it("formats a multi-day range in the venue timezone", () => {
    const label = eventDate(
      event("range", "2026-09-18T23:30:00Z", "2026-09-25T12:00:00Z"),
    );
    expect(label).toContain("19");
    expect(label).toContain("25");
  });
  it("does not interpret an image as a booking URL or invent ticket prices", () => {
    const content = {
      id: 1,
      categoryId: 2,
      title: "Event",
      description: null,
      body: null,
      assetType: AssetType.Image,
      assetReference: "https://example.com/photo.jpg",
      eventStart: "2026-09-24T07:00:00Z",
      eventEnd: null,
      recurrence: { frequency: 0, dayOfWeek: null, weekOfMonth: null },
      locations: [],
    } satisfies PublicContent;
    const result = toVisitorEvent(content, "Culture");
    expect(result.bookingUrl).toBeNull();
    expect(result.tickets).toBeUndefined();
    expect(result.image).toBe(content.assetReference);
  });
  it("rejects executable asset URLs", () => {
    expect(safeWebUrl("javascript:alert(1)")).toBeNull();
    expect(safeWebUrl("data:text/html,test")).toBeNull();
    expect(safeWebUrl("https://example.com/book")).toBe(
      "https://example.com/book",
    );
  });
});

describe("demo ticket totals", () => {
  const tickets = [
    { id: "standard", label: "Adult", note: "", cents: 5000 },
    { id: "free", label: "Child", note: "", cents: 0 },
  ];
  it("counts free children without charging and sums integer cents", () => {
    expect(ticketTotal(tickets, { standard: 2, free: 3 })).toBe(10000);
    expect(ticketTotal(tickets, {})).toBe(0);
  });
  it.each([-1, 1.5, 11, NaN])("rejects invalid quantity %s", (quantity) => {
    expect(() => ticketTotal(tickets, { standard: quantity })).toThrow();
  });
  it("charges once per group and enforces one group per selected demo session", () => {
    const group = [
      { id: "group", label: "Group", note: "", cents: 65000, maxQuantity: 1 },
    ];
    expect(ticketTotal(group, { group: 1 })).toBe(65000);
    expect(() => ticketTotal(group, { group: 2 })).toThrow();
  });
});
