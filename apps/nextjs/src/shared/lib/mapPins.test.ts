import { describe, expect, it } from "vitest";
import { boundsForPins, collectPinCategories, resolvePinColour } from "@/shared/lib/mapPins";

describe("resolvePinColour", () => {
  it("uses the category colour when set", () => {
    expect(resolvePinColour("#7b1f2b")).toBe("#7b1f2b");
  });

  it("falls back to the shared neutral token when the category sets none", () => {
    expect(resolvePinColour(null)).toBe("var(--text-secondary)");
  });
});

describe("boundsForPins", () => {
  it("returns null for an empty set", () => {
    expect(boundsForPins([])).toBeNull();
  });

  it("collapses to a single point for one pin", () => {
    const bounds = boundsForPins([{ latitude: -25.7766, longitude: 28.1753 }]);

    expect(bounds).toEqual({
      southWest: { lat: -25.7766, lng: 28.1753 },
      northEast: { lat: -25.7766, lng: 28.1753 },
    });
  });

  it("spans the min and max of every pin", () => {
    const bounds = boundsForPins([
      { latitude: -25.78, longitude: 28.17 },
      { latitude: -25.77, longitude: 28.18 },
      { latitude: -25.79, longitude: 28.16 },
    ]);

    expect(bounds).toEqual({
      southWest: { lat: -25.79, lng: 28.16 },
      northEast: { lat: -25.77, lng: 28.18 },
    });
  });
});

describe("collectPinCategories", () => {
  it("dedupes by categorySlug, keeping first-seen order", () => {
    const categories = collectPinCategories([
      { categorySlug: "geskiedenis", categoryName: "Geskiedenis", categoryColour: "#7b1f2b" },
      { categorySlug: "natuur", categoryName: "Natuur", categoryColour: null },
      { categorySlug: "geskiedenis", categoryName: "Geskiedenis", categoryColour: "#7b1f2b" },
    ]);

    expect(categories).toEqual([
      { categorySlug: "geskiedenis", categoryName: "Geskiedenis", categoryColour: "#7b1f2b" },
      { categorySlug: "natuur", categoryName: "Natuur", categoryColour: null },
    ]);
  });

  it("returns an empty array for no pins", () => {
    expect(collectPinCategories([])).toEqual([]);
  });
});
