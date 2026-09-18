import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EventAgenda } from "./EventAgenda";
import type { VisitorEvent } from "./eventModel";
afterEach(cleanup);
const event: VisitorEvent = {
  id: "one",
  title: "Septemberfees",
  description: "",
  body: "",
  category: "Fees",
  image: null,
  start: "2026-09-24T07:00:00+02:00",
  end: null,
  recurring: false,
  schedule: "",
  venue: "Terrein",
  priceLabel: "R50",
  facts: [],
  bookingUrl: null,
};
it("does not offer session shortcuts outside a submitted date range", () => {
  render(
    <EventAgenda
      events={[
        {
          ...event,
          recurring: true,
          tickets: [{ id: "adult", label: "Adult", cents: 5000, note: "" }],
          demoSlots: [
            { value: "2026-09-25T09:00:00+02:00", label: "Vr 25 Sep · 09:00" },
          ],
        },
      ]}
      basePath="/voorskou/gebeure"
      language="af"
      returnQuery="van=2026-09-24&tot=2026-09-24"
      recurring
    />,
  );
  expect(screen.queryByRole("link", { name: "Vr 25 Sep · 09:00" })).toBeNull();
  expect(screen.getByText(/Sessies op jou gekose datums/)).toBeTruthy();
});
it("shows every month expanded and orders events chronologically", () => {
  render(
    <EventAgenda
      events={[
        {
          ...event,
          id: "two",
          title: "Oktoberfees",
          start: "2026-10-01T10:00:00+02:00",
        },
        event,
      ]}
      basePath="/gebeure"
      language="af"
      returnQuery=""
    />,
  );
  expect(
    screen
      .getAllByRole("heading", { level: 3 })
      .map((item) => item.textContent),
  ).toEqual(["September 20261 geleentheid", "Oktober 20261 geleentheid"]);
  expect(
    screen
      .getAllByRole("heading", { level: 4 })
      .map((item) => item.textContent),
  ).toEqual(["Septemberfees", "Oktoberfees"]);
});
it("takes a selected session directly into the booking journey", () => {
  render(
    <EventAgenda
      events={[
        {
          ...event,
          recurring: true,
          tickets: [{ id: "adult", label: "Adult", cents: 5000, note: "" }],
          demoSlots: [
            { value: "2026-09-25T09:00:00+02:00", label: "Vr 25 Sep · 09:00" },
          ],
        },
      ]}
      basePath="/voorskou/gebeure"
      language="af"
      returnQuery=""
      recurring
    />,
  );
  expect(
    screen
      .getByRole("link", { name: "Vr 25 Sep · 09:00" })
      .getAttribute("href"),
  ).toContain("sessie=2026-09-25T09%3A00%3A00%2B02%3A00");
});
