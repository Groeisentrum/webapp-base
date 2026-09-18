import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Category } from "@/shared/interfaces/Domain";
import { CreatePinModal } from "@/app/admin/kaart/CreatePinModal";

// CreatePinModal's own map picker (react-leaflet/leaflet) is explicitly out of scope
// for automated tests — see the plan's Testing section.
vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

const { getCategories, createContent, createLocation } = vi.hoisted(() => ({
  getCategories: vi.fn(),
  createContent: vi.fn(),
  createLocation: vi.fn(),
}));

vi.mock("@/shared/services/adminService", () => ({ getCategories }));
vi.mock("@/shared/services/contentService", () => ({ createContent, createLocation }));

function category(overrides: Partial<Category> & { id: number }): Category {
  return {
    parentCategoryId: null,
    name: `Kategorie ${overrides.id}`,
    slug: `kategorie-${overrides.id}`,
    colour: null,
    icon: null,
    sortOrder: 0,
    visibility: 0,
    visibleToRoles: [],
    createdAt: "2026-09-14T00:00:00Z",
    ...overrides,
  } as Category;
}

function renderModal(coordinates: { lat: number; lng: number } | null, onClose = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreatePinModal coordinates={coordinates} onClose={onClose} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getCategories.mockResolvedValue([category({ id: 1 }), category({ id: 2 })]);
});

afterEach(cleanup);

describe("CreatePinModal", () => {
  it("disables save until a title is entered", async () => {
    renderModal({ lat: -25.7766, lng: 28.1753 });

    await screen.findByLabelText("Titel");

    const saveButton = screen.getByRole("button", { name: "Skep punt" }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Titel"), { target: { value: "Nuwe punt" } });

    expect(saveButton.disabled).toBe(false);
  });

  it("creates the content item then attaches a location at the clicked coordinates", async () => {
    createContent.mockResolvedValue({ id: 99 });
    createLocation.mockResolvedValue({});

    renderModal({ lat: -25.7766, lng: 28.1753 });

    fireEvent.change(await screen.findByLabelText("Titel"), { target: { value: "Nuwe punt" } });
    fireEvent.click(screen.getByRole("button", { name: "Skep punt" }));

    await waitFor(() => expect(createContent).toHaveBeenCalled());
    expect(createContent.mock.calls[0][0]).toMatchObject({ title: "Nuwe punt", categoryId: 1 });

    await waitFor(() =>
      expect(createLocation).toHaveBeenCalledWith({
        contentId: 99,
        latitude: -25.7766,
        longitude: 28.1753,
        label: null,
        addressLine: null,
        notes: null,
      }),
    );
  });

  it("warns instead of showing a form when there are no categories yet", async () => {
    getCategories.mockResolvedValue([]);

    renderModal({ lat: -25.7766, lng: 28.1753 });

    expect(
      await screen.findByText("Skep eers 'n kategorie voordat jy 'n punt byvoeg.", { exact: false }),
    ).toBeTruthy();
  });
});
