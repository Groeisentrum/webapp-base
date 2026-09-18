import type {
  CatalogueAttraction,
  CatalogueAttractionId,
} from "@/shared/lib/dagbeplanner/types";

/**
 * Mock points-of-interest catalogue for the Dagbeplanner prototype.
 *
 * Deliberately not sourced from `GET /api/public/locations`: that feed has no transit
 * geometry between pins, and the day planner's core interaction (auto-walk items,
 * nearest-neighbour routing) needs a small, hand-tuned distance graph to demonstrate
 * against. Swapping this for real data later means adding transit times to the
 * locations contract, not changing this module's shape.
 */
export const CATALOGUE: CatalogueAttraction[] = [
  {
    id: "cenotaph-hall",
    name: "Senotaafsaal (Cenotaph Hall)",
    shortDescription: "Kyk af op die sarkofaag deur die opening in die koepel.",
    dwellMinutes: 15,
    categoryColour: "#7b1f2b",
  },
  {
    id: "marble-frieze",
    name: "Historiese Marmerfries",
    shortDescription: "27 marmerpanele wat die Groot Trek uitbeeld.",
    dwellMinutes: 20,
    categoryColour: "#7b1f2b",
  },
  {
    id: "fort-schanskop",
    name: "Fort Schanskop",
    shortDescription: "Bewaarde 1890's fort met uitsig oor Pretoria.",
    dwellMinutes: 30,
    categoryColour: "#3d5a3f",
  },
  {
    id: "pioneer-farmyard",
    name: "Pionierswerf",
    shortDescription: "Lewende-geskiedenis plaaswerf van die Voortrekker-era.",
    dwellMinutes: 25,
    categoryColour: "#3d5a3f",
  },
  {
    id: "heritage-centre",
    name: "Erfenissentrum",
    shortDescription:
      "Museum, geskenkwinkel en inligtingsentrum by die ingang.",
    dwellMinutes: 40,
    categoryColour: "#2d4a6b",
  },
  {
    id: "monument-restaurant",
    name: "Monument-restaurant",
    shortDescription: "Ete met uitsig oor die Fontein-terras.",
    dwellMinutes: 45,
    categoryColour: "#8a6116",
  },
];

export const CATALOGUE_BY_ID: Record<
  CatalogueAttractionId,
  CatalogueAttraction
> = Object.fromEntries(
  CATALOGUE.map((attraction) => [attraction.id, attraction]),
) as Record<CatalogueAttractionId, CatalogueAttraction>;

/** Synthetic origin node — the main gate — for computing the first walk leg. */
export const ENTRANCE_ID = "entrance";
export const ENTRANCE_NAME = "Hoofingang";

type LocationId = CatalogueAttractionId | typeof ENTRANCE_ID;

/**
 * Base transit minutes at medium pace, undirected. Hand-tuned to the monument's real
 * layout: the Heritage Centre and restaurant sit near the entrance, Cenotaph Hall and
 * the frieze share the same building (a short walk apart), and Fort Schanskop and the
 * Pioneer Farmyard are the two outlying outdoor sites.
 */
const BASE_TRANSIT_MINUTES: Array<[LocationId, LocationId, number]> = [
  [ENTRANCE_ID, "heritage-centre", 3],
  [ENTRANCE_ID, "monument-restaurant", 4],
  [ENTRANCE_ID, "cenotaph-hall", 8],
  [ENTRANCE_ID, "marble-frieze", 9],
  [ENTRANCE_ID, "fort-schanskop", 12],
  [ENTRANCE_ID, "pioneer-farmyard", 14],
  ["heritage-centre", "monument-restaurant", 3],
  ["heritage-centre", "cenotaph-hall", 6],
  ["heritage-centre", "marble-frieze", 7],
  ["heritage-centre", "fort-schanskop", 10],
  ["heritage-centre", "pioneer-farmyard", 12],
  ["monument-restaurant", "cenotaph-hall", 7],
  ["monument-restaurant", "marble-frieze", 8],
  ["monument-restaurant", "fort-schanskop", 11],
  ["monument-restaurant", "pioneer-farmyard", 13],
  ["cenotaph-hall", "marble-frieze", 2],
  ["cenotaph-hall", "fort-schanskop", 9],
  ["cenotaph-hall", "pioneer-farmyard", 10],
  ["marble-frieze", "fort-schanskop", 9],
  ["marble-frieze", "pioneer-farmyard", 10],
  ["fort-schanskop", "pioneer-farmyard", 6],
];

const TRANSIT_LOOKUP = new Map<string, number>();
for (const [a, b, minutes] of BASE_TRANSIT_MINUTES) {
  TRANSIT_LOOKUP.set(pairKey(a, b), minutes);
}

function pairKey(a: LocationId, b: LocationId): string {
  return [a, b].sort().join("|");
}

/** Falls back to a conservative default for any pair the hand-tuned graph omits. */
export function getBaseTransitMinutes(
  fromId: LocationId,
  toId: LocationId,
): number {
  if (fromId === toId) return 0;

  return TRANSIT_LOOKUP.get(pairKey(fromId, toId)) ?? 10;
}

export function locationName(id: LocationId): string {
  return id === ENTRANCE_ID ? ENTRANCE_NAME : CATALOGUE_BY_ID[id].name;
}
