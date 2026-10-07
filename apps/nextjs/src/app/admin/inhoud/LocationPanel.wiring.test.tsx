import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Content, LocationDetail } from "@/shared/interfaces/Domain";
import { AssetType, RecurrenceFrequency, Visibility } from "@/shared/interfaces/Domain";
import { LocationPanel } from "@/app/admin/inhoud/LocationPanel";

// LocationMapPicker itself (react-leaflet/leaflet, real click/pan/zoom behaviour) is
// explicitly out of scope for automated tests — see the plan's Testing section.
// Stubbing next/dynamic renders a plain button standing in for "click the map",
// which is enough to exercise LocationPanel's own state and validation logic.
vi.mock("next/dynamic", () => ({
  default: () => PickerStub,
}));

function PickerStub({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  return (
    <button type="button" onClick={() => onPick(-25.7766, 28.1753)}>
      Kies plek (toets)
    </button>
  );
}

const { getLocations, createLocation, updateLocation, deleteLocation } = vi.hoisted(() => ({
  getLocations: vi.fn(),
  createLocation: vi.fn(),
  updateLocation: vi.fn(),
  deleteLocation: vi.fn(),
}));

vi.mock("@/shared/services/contentService", () => ({
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
}));

function content(overrides: Partial<Content> & { id: number }): Content {
  return {
    categoryId: 1,
    title: "Hoofmonument",
    description: null,
    body: null,
    assetType: AssetType.None,
    assetReference: null,
    publishedAt: null,
    unpublishedAt: null,
    eventStart: null,
    eventEnd: null,
    recurrence: { frequency: RecurrenceFrequency.None, dayOfWeek: null, weekOfMonth: null },
    visibility: Visibility.Public,
    visibleToRoles: [],
    createdAt: "2026-09-14T00:00:00Z",
    updatedAt: null,
    ...overrides,
  };
}

function renderPanel(target: Content) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LocationPanel content={target} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getLocations.mockResolvedValue([]);
});

afterEach(cleanup);

describe("LocationPanel", () => {
  it("shows an empty message when the content item has no locations yet", async () => {
    renderPanel(content({ id: 1 }));

    expect(await screen.findByText("Nog geen ligging vir hierdie inhoud nie.")).toBeTruthy();
  });

  it("lists existing locations with their coordinates", async () => {
    const existing: LocationDetail = {
      id: 5,
      contentId: 1,
      latitude: -25.7766,
      longitude: 28.1753,
      label: "Hoofingang",
      addressLine: null,
      notes: null,
      tourStopId: null,
      arAnchorId: null,
      nfcTagId: null,
    };
    getLocations.mockResolvedValue([existing]);

    renderPanel(content({ id: 1 }));

    expect(await screen.findByText(/Hoofingang/)).toBeTruthy();
    expect(screen.getByText(/-25.776600, 28.175300/)).toBeTruthy();
  });

  it("disables save until a point has been picked", async () => {
    renderPanel(content({ id: 1 }));

    fireEvent.click(await screen.findByRole("button", { name: "Voeg ligging by" }));

    const saveButton = screen.getByRole("button", { name: "Stoor ligging" }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
  });

  it("creates a location with the picked coordinates and this content's id", async () => {
    createLocation.mockResolvedValue({});
    renderPanel(content({ id: 42 }));

    fireEvent.click(await screen.findByRole("button", { name: "Voeg ligging by" }));
    fireEvent.click(screen.getByRole("button", { name: "Kies plek (toets)" }));
    fireEvent.click(screen.getByRole("button", { name: "Stoor ligging" }));

    await waitFor(() =>
      expect(createLocation).toHaveBeenCalledWith({
        contentId: 42,
        latitude: -25.7766,
        longitude: 28.1753,
        label: null,
        addressLine: null,
        notes: null,
      }),
    );
  });

  it("rejects an out-of-range latitude typed directly into the field", async () => {
    renderPanel(content({ id: 1 }));

    fireEvent.click(await screen.findByRole("button", { name: "Voeg ligging by" }));
    fireEvent.change(screen.getByLabelText("Breedtegraad"), { target: { value: "95" } });

    expect(await screen.findByText("Moet tussen -90 en 90 wees.")).toBeTruthy();
    const saveButton = screen.getByRole("button", { name: "Stoor ligging" }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
  });
});
