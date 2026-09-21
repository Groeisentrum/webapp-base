import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PublicLocation } from "@/shared/interfaces/Domain";
import { KaartClient } from "@/app/public/kaart/KaartClient";

// MapView itself (react-leaflet/leaflet, real tile rendering, marker interaction) is
// explicitly out of scope for automated tests — see the plan's Testing section.
// Stubbing out next/dynamic (hoisted above this file's imports by vitest) keeps this
// file from ever touching Leaflet: KaartClient's dynamic() call resolves to the stub
// synchronously instead of loading a lazy chunk.
vi.mock("next/dynamic", () => ({
  default: () => MapStub,
}));

function MapStub({ locations }: { locations: PublicLocation[] }) {
  return <div data-testid="map-stub">{locations.map((location) => location.name).join(",")}</div>;
}

afterEach(cleanup);

function location(overrides: Partial<PublicLocation> & { id: number }): PublicLocation {
  return {
    contentId: overrides.id,
    name: `Punt ${overrides.id}`,
    shortDescription: null,
    categoryId: 1,
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
    ...overrides,
  };
}

describe("KaartClient (public)", () => {
  it("shows an empty state when there are no locations", () => {
    render(<KaartClient locations={[]} language="af" />);

    expect(screen.getByText("Nog geen liggings nie.")).toBeTruthy();
    expect(screen.queryByTestId("map-stub")).toBeNull();
  });

  it("passes every location through to the map by default", () => {
    const locations = [
      location({ id: 1, categorySlug: "geskiedenis", categoryName: "Geskiedenis" }),
      location({ id: 2, categorySlug: "natuur", categoryName: "Natuur", categoryColour: null }),
    ];

    render(<KaartClient locations={locations} language="af" />);

    expect(screen.getByTestId("map-stub").textContent).toBe("Punt 1,Punt 2");
  });

  it("narrows the map to the toggled category when a legend chip is clicked", () => {
    const locations = [
      location({ id: 1, categorySlug: "geskiedenis", categoryName: "Geskiedenis" }),
      location({ id: 2, categorySlug: "natuur", categoryName: "Natuur", categoryColour: null }),
    ];

    render(<KaartClient locations={locations} language="af" />);

    fireEvent.click(screen.getByRole("button", { name: "Natuur" }));

    expect(screen.getByTestId("map-stub").textContent).toBe("Punt 1");
  });

  it("does not render a legend when every pin shares one category", () => {
    const locations = [location({ id: 1 })];

    render(<KaartClient locations={locations} language="af" />);

    expect(screen.queryByRole("button", { name: "Geskiedenis" })).toBeNull();
  });
});
