import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

function MapStub({
  locations,
  nearbyLocationIds,
  revealAllDetails,
}: {
  locations: PublicLocation[];
  nearbyLocationIds?: ReadonlySet<number>;
  revealAllDetails?: boolean;
}) {
  return (
    <div data-testid="map-stub">
      {locations.map((location) => location.name).join(",")}
      <span data-testid="nearby-location-ids">
        {[...(nearbyLocationIds ?? [])].sort((left, right) => left - right).join(",")}
      </span>
      {revealAllDetails && <span data-testid="all-details-visible">all-details-visible</span>}
    </div>
  );
}

afterEach(cleanup);

beforeEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: undefined,
  });
});

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

  it("requests the visitor location and lists a nearby display", async () => {
    const watchPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: -25.7766,
          longitude: 28.1753,
          accuracy: 8,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      });
      return 1;
    });
    const clearWatch = vi.fn();

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { watchPosition, clearWatch },
    });

    render(<KaartClient locations={[location({ id: 1 })]} language="af" />);

    fireEvent.click(screen.getByRole("button", { name: "Wys my ligging" }));

    await waitFor(() => expect(screen.getByText("Jy is naby 'n uitstalling")).toBeTruthy());
    expect(screen.getByRole("link", { name: "Meer inligting" })).toBeTruthy();
    expect(watchPosition).toHaveBeenCalledOnce();
    expect(screen.getByTestId("nearby-location-ids").textContent).toBe("1");
  });

  it("only highlights locations within the fixed 20 metre radius", async () => {
    const watchPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: -25.7766,
          longitude: 28.1753,
          accuracy: 8,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      });
      return 1;
    });

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { watchPosition, clearWatch: vi.fn() },
    });

    render(
      <KaartClient
        locations={[
          location({ id: 1, latitude: -25.7767 }),
          location({ id: 2, latitude: -25.7769 }),
        ]}
        language="af"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Wys my ligging" }));

    await waitFor(() => expect(screen.getByTestId("nearby-location-ids").textContent).toBe("1"));
  });

  it("shows the relevant message when location permission is denied or unavailable", async () => {
    const watchPosition = vi.fn((_: PositionCallback, error: PositionErrorCallback) => {
      error({ code: 1, message: "denied" } as GeolocationPositionError);
      return 1;
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { watchPosition, clearWatch: vi.fn() },
    });

    const { unmount } = render(<KaartClient locations={[location({ id: 1 })]} language="af" />);
    fireEvent.click(screen.getByRole("button", { name: "Wys my ligging" }));
    expect(await screen.findByText(/Liggingtoegang is geweier/)).toBeTruthy();

    unmount();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        watchPosition: vi.fn((_: PositionCallback, error: PositionErrorCallback) => {
          error({ code: 2, message: "unavailable" } as GeolocationPositionError);
          return 1;
        }),
        clearWatch: vi.fn(),
      },
    });

    render(<KaartClient locations={[location({ id: 1 })]} language="af" />);
    fireEvent.click(screen.getByRole("button", { name: "Wys my ligging" }));
    expect(await screen.findByText(/Jou ligging is tans nie beskikbaar/)).toBeTruthy();
  });

  it("lets visitors reveal all details for the current session", async () => {
    render(<KaartClient locations={[location({ id: 1 })]} language="af" />);

    const toggle = screen.getByRole("button", { name: "Sien alle inligting" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "Versteek inligting" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("all-details-visible")).toBeTruthy();
    expect(screen.getByTestId("nearby-location-ids").textContent).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Versteek inligting" }));
    expect(screen.queryByTestId("all-details-visible")).toBeNull();
  });
});
