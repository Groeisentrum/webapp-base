/**
 * Core types for the Dagbeplanner (day planner). Self-contained: the widget works
 * against the mock catalogue in `catalogue.ts` rather than `GET /api/public/locations`,
 * so these are deliberately not `PublicLocation` — see catalogue.ts for why.
 */

export type MobilitySpeed = "fast" | "medium" | "slow" | "wheelchair";

export type CatalogueAttractionId =
  | "cenotaph-hall"
  | "marble-frieze"
  | "fort-schanskop"
  | "pioneer-farmyard"
  | "heritage-centre"
  | "monument-restaurant";

export type CatalogueAttraction = {
  id: CatalogueAttractionId;
  name: string;
  shortDescription: string;
  /** Minutes a typical visitor spends here. Seeds a scheduled stop's editable dwell time. */
  dwellMinutes: number;
  categoryColour: string;
};

/**
 * A scheduled stop. `attractionId` is null for a user-added custom activity — those
 * have no mapped location, so they never generate an auto-walk item (see engine.ts).
 */
export type DestinationEntry = {
  kind: "destination";
  entryId: string;
  attractionId: CatalogueAttractionId | null;
  name: string;
  dwellMinutes: number;
  isCustom: boolean;
};

/**
 * System-generated transit leg. Always derived fresh from the destination list by
 * `recomputeWalkChain` — never hand-edited or persisted on its own, so it can never
 * drift out of sync with the destinations around it.
 */
export type WalkEntry = {
  kind: "walk";
  entryId: string;
  /** Minutes at medium pace. Scaled live by the active mobility speed at render time. */
  baseMinutes: number;
  fromName: string;
  toName: string;
};

export type PlannerEntry = DestinationEntry | WalkEntry;

export type ScheduledEntry = {
  entry: PlannerEntry;
  startMinutes: number;
  endMinutes: number;
};

export type BudgetTier = "onTrack" | "softOverBudget";

export type BudgetSummary = {
  tier: BudgetTier;
  totalElapsedMinutes: number;
  /** Budget minus elapsed. Positive is spare time, negative is over budget. */
  bufferMinutes: number;
  finishTimeMinutes: number;
  /** Tier 3: true once the plan's last stop ends after the 17:00 gate closure. */
  closingTimeViolation: boolean;
  /** The first entry that pushes the plan past the time budget, or null if never. */
  cutoffEntryId: string | null;
};

/** The payload carried in a shared `?dagplan=` URL and in localStorage. */
export type PlanPayload = {
  startTime: string;
  timeBudgetMinutes: number;
  speed: MobilitySpeed;
  destinations: DestinationEntry[];
};
