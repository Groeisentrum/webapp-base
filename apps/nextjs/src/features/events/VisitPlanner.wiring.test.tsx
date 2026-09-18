import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { EventExplorer } from "./EventExplorer";
import type { VisitorEvent } from "./eventModel";
afterEach(cleanup);
const event: VisitorEvent = {
  id: "art",
  title: "Kunsuitstalling",
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
it("keeps the full agenda visible while answering, applies on submit, then restores everything", () => {
  render(
    <EventExplorer
      events={[
        event,
        {
          ...event,
          id: "festival",
          title: "Erfenisfees",
          category: "Feeste",
          start: "2026-09-24T07:00:00+02:00",
          end: "2026-09-24T17:00:00+02:00",
        },
      ]}
      language="af"
    />,
  );
  document.querySelector("details")!.open = true;
  fireEvent.click(screen.getByRole("button", { name: "24 September 2026" }));
  fireEvent.click(screen.getByRole("button", { name: "Feeste" }));
  fireEvent.change(screen.getByLabelText("Hoeveel mense?"), {
    target: { value: "4" },
  });
  expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Wys my opsies" }));
  expect(
    screen
      .getAllByRole("heading", { level: 4 })
      .map((node) => node.textContent),
  ).toEqual(["Erfenisfees"]);
  document.querySelector("details")!.open = true;
  fireEvent.click(screen.getByRole("button", { name: "Kuns & kultuur" }));
  expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Wys alle gebeure" }));
  expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(2);
  expect(document.querySelector("details")!.open).toBe(false);
});
