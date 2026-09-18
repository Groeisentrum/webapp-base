import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { VisitDatePicker } from "./VisitDatePicker";
import { EnquiryButton } from "./EnquiryButton";
afterEach(cleanup);
it("selects a single day, a reverse range and then a fresh day without mode controls", () => {
  function Calendar() {
    const [dates, setDates] = useState({
      from: "2026-09-01",
      to: "2026-09-01",
    });
    return (
      <VisitDatePicker
        {...dates}
        onChange={(from, to) => setDates({ from, to })}
      />
    );
  }
  render(<Calendar />);
  fireEvent.click(screen.getByRole("button", { name: "24 September 2026" }));
  expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "22 September 2026" }));
  expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(3);
  fireEvent.click(screen.getByRole("button", { name: "26 September 2026" }));
  expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
});
it("opens an enquiry in place, reviews without claiming delivery and restores focus on Escape", () => {
  render(<EnquiryButton subject="Perdry" />);
  const trigger = screen.getByRole("button", { name: "Doen navraag" });
  fireEvent.click(trigger);
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByLabelText("Jou naam"));
  fireEvent.change(screen.getByLabelText("Jou naam"), {
    target: { value: "Toets Besoeker" },
  });
  fireEvent.change(screen.getByLabelText("E-posadres"), {
    target: { value: "test@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Waarmee kan ons help?"), {
    target: { value: "Groep van vier" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Hersien navraag" }).closest("form")!,
  );
  expect(screen.getByRole("status").textContent).toContain(
    "nog nie gestuur nie",
  );
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(trigger);
});
