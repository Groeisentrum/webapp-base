import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BookingFlow } from "./BookingFlow";
import type { VisitorEvent } from "./eventModel";

afterEach(cleanup);
const event: VisitorEvent = {
  id: "festival",
  title: "Fees",
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
  tickets: [{ id: "adult", label: "Volwassene", note: "", cents: 5000 }],
};
it("requires a selection, preserves it when editing, and produces only a demo confirmation", () => {
  render(
    <BookingFlow event={event} basePath="/voorskou/gebeure" language="af" />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Gaan voort" }));
  expect(screen.getByRole("alert").textContent).toContain("Kies minstens");
  fireEvent.click(screen.getByRole("button", { name: "Meer: Volwassene" }));
  fireEvent.click(screen.getByRole("button", { name: "Gaan voort" }));
  expect((screen.getByLabelText("Kontaknaam") as HTMLInputElement).value).toBe(
    "",
  );
  fireEvent.change(screen.getByLabelText("Kontaknaam"), {
    target: { value: "Toets Besoeker" },
  });
  fireEvent.change(screen.getByLabelText("E-posadres"), {
    target: { value: "besoeker@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Terug" }));
  expect(screen.getByLabelText("Aantal: Volwassene").textContent).toBe("1");
  fireEvent.click(screen.getByRole("button", { name: "Gaan voort" }));
  fireEvent.click(screen.getByRole("button", { name: "Gaan voort" }));
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(
    screen.getByRole("button", { name: "Bekyk besoekopsomming" }),
  );
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Jou uitstappie neem vorm aan.",
  );
  expect(screen.getByText(/Geen kaartjies is uitgereik/)).toBeTruthy();
});
it("requires a session before advancing a recurring booking", () => {
  render(
    <BookingFlow
      event={{
        ...event,
        recurring: true,
        demoSlots: [{ value: "slot", label: "Voorbeeldsessie" }],
      }}
      basePath="/voorskou/gebeure"
      language="af"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Meer: Volwassene" }));
  fireEvent.submit(
    screen.getByRole("button", { name: "Gaan voort" }).closest("form")!,
  );
  expect(screen.getByRole("alert").textContent).toContain("sessie");
});
