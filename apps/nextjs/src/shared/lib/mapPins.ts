/**
 * Pure helpers for rendering a set of pins on a map, kept framework-agnostic (no
 * Leaflet import) so this stays trivially unit-testable without a DOM. The Leaflet
 * map component converts `SimpleBounds` into a real `L.LatLngBounds` at the point of
 * use.
 */

export type LatLng = { lat: number; lng: number };
export type SimpleBounds = { southWest: LatLng; northEast: LatLng };

type PinLocation = { latitude: number; longitude: number };
type PinCategory = { categorySlug: string; categoryName: string; categoryColour: string | null };

/**
 * The pin/legend colour for a category. Categories may set no colour at all — fall
 * back to the shared neutral token rather than inventing a per-category default.
 */
export function resolvePinColour(categoryColour: string | null): string {
  return categoryColour ?? "var(--text-secondary)";
}

/** The bounding box containing every pin, or null when there are none to fit. */
export function boundsForPins(pins: PinLocation[]): SimpleBounds | null {
  if (pins.length === 0) return null;

  let south = pins[0].latitude;
  let north = pins[0].latitude;
  let west = pins[0].longitude;
  let east = pins[0].longitude;

  for (const pin of pins) {
    south = Math.min(south, pin.latitude);
    north = Math.max(north, pin.latitude);
    west = Math.min(west, pin.longitude);
    east = Math.max(east, pin.longitude);
  }

  return { southWest: { lat: south, lng: west }, northEast: { lat: north, lng: east } };
}

/**
 * The distinct categories represented across a set of pins, in first-seen order.
 * Keyed on `categorySlug` per the locations contract — the name changes with
 * language, the slug does not.
 */
export function collectPinCategories(pins: PinCategory[]): PinCategory[] {
  const seen = new Map<string, PinCategory>();

  for (const pin of pins) {
    if (!seen.has(pin.categorySlug)) {
      seen.set(pin.categorySlug, {
        categorySlug: pin.categorySlug,
        categoryName: pin.categoryName,
        categoryColour: pin.categoryColour,
      });
    }
  }

  return [...seen.values()];
}
