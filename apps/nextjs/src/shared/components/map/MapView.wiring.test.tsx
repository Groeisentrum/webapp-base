import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { PublicLocation } from "@/shared/interfaces/Domain";
import { MapView } from "@/shared/components/map/MapView";

const { setView } = vi.hoisted(() => ({ setView: vi.fn() }));

vi.mock("react-leaflet", () => ({
  Circle: ({ children, radius }: { children?: ReactNode; radius: number }) => (
    <div data-testid="circle" data-radius={radius}>
      {children}
    </div>
  ),
  CircleMarker: ({
    children,
    radius,
    pathOptions,
  }: {
    children?: ReactNode;
    radius: number;
    pathOptions?: { color?: string };
  }) => (
    <div data-testid="circle-marker" data-color={pathOptions?.color} data-radius={radius}>
      {children}
    </div>
  ),
  Marker: ({ children }: { children?: ReactNode }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  useMap: () => ({ getZoom: () => 12, setView }),
}));

vi.mock("@/shared/components/map/LeafletMap", () => ({
  LeafletMap: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  createColourIcon: vi.fn(),
}));

afterEach(cleanup);

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

describe("MapView", () => {
  it("renders only the fixed proximity circle and not GPS accuracy details", () => {
    render(
      <MapView
        locations={[location]}
        userPosition={{ latitude: -25.7766, longitude: 28.1753, accuracy: 500 }}
        nearbyLocationIds={new Set([location.id])}
        revealAllDetails={false}
      />,
    );

    expect(screen.getAllByTestId("circle")).toHaveLength(1);
    expect(screen.getByTestId("circle").getAttribute("data-radius")).toBe("20");
    expect(screen.queryByText(/Akkuraatheid/)).toBeNull();
    expect(screen.getByText("Jou ligging")).toBeTruthy();
    expect(
      screen.getAllByTestId("circle-marker").some(
        (node) =>
          node.getAttribute("data-radius") === "13" &&
          node.getAttribute("data-color") === "#7b1f2b",
      ),
    ).toBe(true);
  });

  it("keeps full popup details for the admin map defaults", () => {
    render(<MapView locations={[location]} />);

    expect(screen.getByText(location.name)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Meer inligting" })).toBeTruthy();
    expect(screen.queryAllByTestId("circle")).toHaveLength(0);
  });
});
