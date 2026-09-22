import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { PublicLocation } from "@/shared/interfaces/Domain";
import { LocationPopup } from "@/shared/components/map/LocationPopup";

const location: PublicLocation = {
  id: 1,
  contentId: 42,
  name: "Voortrekkermonument",
  shortDescription: "Die hoofmonument.",
  categoryId: 7,
  categoryName: "Geskiedenis",
  categorySlug: "geskiedenis",
  categoryColour: "#7b1f2b",
  photoReference: null,
  latitude: -25.7766,
  longitude: 28.1753,
  addressLine: null,
  tourStopId: null,
  arAnchorId: null,
  nfcTagId: null,
};

describe("LocationPopup", () => {
  it("does not reveal exhibit information before the visitor is nearby", () => {
    render(<LocationPopup location={location} isDetailsVisible={false} />);

    expect(screen.getByText("Ligging op die kaart")).toBeTruthy();
    expect(screen.getByText(/Kom nader/)).toBeTruthy();
    expect(screen.queryByText(location.name)).toBeNull();
    expect(screen.queryByRole("link", { name: "Meer inligting" })).toBeNull();
  });

  it("reveals the display link when the proximity rule allows it", () => {
    render(<LocationPopup location={location} isDetailsVisible />);

    expect(screen.getByText(location.name)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Meer inligting" })).toBeTruthy();
  });
});
