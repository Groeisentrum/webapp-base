import {
  CATALOGUE,
  CATALOGUE_BY_ID,
  ENTRANCE_ID,
  ENTRANCE_NAME,
  getBaseTransitMinutes,
  locationName,
} from "@/shared/lib/dagbeplanner/catalogue";
import type {
  BudgetSummary,
  CatalogueAttractionId,
  DestinationEntry,
  MobilitySpeed,
  PlannerEntry,
  ScheduledEntry,
  WalkEntry,
} from "@/shared/lib/dagbeplanner/types";

/** Monument gate closure. Tier 3 fires the moment a plan's last stop ends after this. */
export const CLOSING_TIME_MINUTES = 17 * 60;

export const DEFAULT_START_TIME = "09:30";
export const DEFAULT_TIME_BUDGET_MINUTES = 180;

/**
 * Scales every auto-walk item's duration. Fast visitors cover ground in three quarters
 * of the base time; a wheelchair/accessible profile needs double, since the base graph
 * is tuned for an able-bodied medium pace.
 */
export const SPEED_MULTIPLIERS: Record<MobilitySpeed, number> = {
  fast: 0.75,
  medium: 1,
  slow: 1.5,
  wheelchair: 2,
};

export const SPEED_LABELS: Record<MobilitySpeed, string> = {
  fast: "Vinnig",
  medium: "Gemiddeld",
  slow: "Stadig",
  wheelchair: "Rolstoel / Toeganklik",
};

let idCounter = 0;

/** Client-only id generator — every call site runs after user interaction, never during SSR render. */
function makeEntryId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

export function scaleWalkMinutes(
  baseMinutes: number,
  speed: MobilitySpeed,
): number {
  return Math.max(1, Math.round(baseMinutes * SPEED_MULTIPLIERS[speed]));
}

export function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function formatMinutesAsTime(totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function getMinutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

const OPENING_TIME_MINUTES = 8 * 60;
/**
 * The practical cutoff for rounding into a same-day start: less than half an hour
 * before closing isn't enough to round up into, so from here it collapses into the
 * same "offer tomorrow's opening" fallback as the spec's explicit "after 17:00" case.
 */
const LAST_ROUNDING_MINUTES = 16 * 60 + 30;

/**
 * The onboarding screen's default start time, driven by the device clock instead of a
 * fixed default. Mid-day, it rounds up to the next quarter hour; outside opening hours
 * (too early, or too close to / past closing) it offers tomorrow's 08:00 instead.
 */
export function getDefaultStartTime(now: Date = new Date()): string {
  const currentMinutes = getMinutesSinceMidnight(now);

  if (
    currentMinutes < OPENING_TIME_MINUTES ||
    currentMinutes > LAST_ROUNDING_MINUTES
  ) {
    return formatMinutesAsTime(OPENING_TIME_MINUTES);
  }

  return formatMinutesAsTime(Math.ceil(currentMinutes / 15) * 15);
}

/**
 * How many minutes the real clock has passed a stop's scheduled finish — 0 while still
 * on time or early. This is a planning comparison, not GPS tracking: it only knows what
 * the plan *says* should be finished by now, not whether the visitor has actually moved on.
 */
export function getDelayMinutes(
  scheduledEndMinutes: number,
  currentMinutes: number,
): number {
  return Math.max(0, currentMinutes - scheduledEndMinutes);
}

function createDestinationEntry(
  attraction: {
    id: CatalogueAttractionId | null;
    name: string;
    dwellMinutes: number;
  },
  isCustom: boolean,
): DestinationEntry {
  return {
    kind: "destination",
    entryId: makeEntryId("dest"),
    attractionId: attraction.id,
    name: attraction.name,
    dwellMinutes: attraction.dwellMinutes,
    isCustom,
  };
}

export function createCatalogueDestination(
  attractionId: CatalogueAttractionId,
): DestinationEntry {
  const attraction = CATALOGUE_BY_ID[attractionId];

  return createDestinationEntry(attraction, false);
}

export function createCustomDestination(
  name: string,
  dwellMinutes: number,
): DestinationEntry {
  return createDestinationEntry({ id: null, name, dwellMinutes }, true);
}

/**
 * Every auto-walk item is derived, never persisted or hand-edited: this rebuilds the
 * full walk chain from the destination list alone, so a reorder, insert or removal can
 * never leave a stale walk item pointing at a place that is no longer adjacent.
 *
 * Custom activities never get a preceding walk item and never advance the "current
 * location" used to cost the next leg — they are treated as happening wherever the
 * visitor already is, since they carry no mapped location of their own.
 */
export function recomputeWalkChain(
  destinations: DestinationEntry[],
): PlannerEntry[] {
  const result: PlannerEntry[] = [];
  let originId: string = ENTRANCE_ID;

  for (const destination of destinations) {
    if (!destination.isCustom && destination.attractionId) {
      const attraction = CATALOGUE_BY_ID[destination.attractionId];
      const walk: WalkEntry = {
        kind: "walk",
        entryId: makeEntryId("walk"),
        baseMinutes: getBaseTransitMinutes(
          originId as CatalogueAttractionId | typeof ENTRANCE_ID,
          attraction.id,
        ),
        fromName:
          originId === ENTRANCE_ID
            ? ENTRANCE_NAME
            : locationName(originId as CatalogueAttractionId),
        toName: attraction.name,
      };

      result.push(walk);
      originId = attraction.id;
    }

    result.push(destination);
  }

  return result;
}

export function computeSchedule(
  destinations: DestinationEntry[],
  startTimeMinutes: number,
  speed: MobilitySpeed,
): ScheduledEntry[] {
  const entries = recomputeWalkChain(destinations);

  let cursor = startTimeMinutes;
  const scheduled: ScheduledEntry[] = [];

  for (const entry of entries) {
    const duration =
      entry.kind === "walk"
        ? scaleWalkMinutes(entry.baseMinutes, speed)
        : entry.dwellMinutes;
    const start = cursor;
    const end = cursor + duration;

    scheduled.push({ entry, startMinutes: start, endMinutes: end });
    cursor = end;
  }

  return scheduled;
}

/**
 * The 3-tier warning hierarchy. Budget (Tier 1/2) and closing time (Tier 3) are
 * independent checks — a plan can be under budget yet still run past 17:00 if the
 * budget itself was set too generously, so both surface at once rather than one
 * masking the other.
 */
export function computeBudgetSummary(
  scheduled: ScheduledEntry[],
  startTimeMinutes: number,
  timeBudgetMinutes: number,
): BudgetSummary {
  const finishTimeMinutes =
    scheduled.length > 0
      ? scheduled[scheduled.length - 1].endMinutes
      : startTimeMinutes;
  const totalElapsedMinutes = finishTimeMinutes - startTimeMinutes;
  const bufferMinutes = timeBudgetMinutes - totalElapsedMinutes;
  const tier =
    totalElapsedMinutes <= timeBudgetMinutes ? "onTrack" : "softOverBudget";
  const closingTimeViolation = finishTimeMinutes > CLOSING_TIME_MINUTES;

  let cutoffEntryId: string | null = null;
  if (tier === "softOverBudget") {
    const budgetAbsoluteMinutes = startTimeMinutes + timeBudgetMinutes;
    const firstOverBudget = scheduled.find(
      (item) => item.endMinutes > budgetAbsoluteMinutes,
    );
    cutoffEntryId = firstOverBudget ? firstOverBudget.entry.entryId : null;
  }

  return {
    tier,
    totalElapsedMinutes,
    bufferMinutes,
    finishTimeMinutes,
    closingTimeViolation,
    cutoffEntryId,
  };
}

/**
 * The mobile footer's "(Xm left)" figure: the upcoming destination's own dwell time
 * plus the walk item immediately in front of it, if any — bundled into one number
 * because that is what is actually left to do before the visitor can move on.
 */
export function getDestinationMinutesLeft(
  entries: PlannerEntry[],
  destinationEntryId: string,
  speed: MobilitySpeed,
): number {
  const index = entries.findIndex(
    (entry) => entry.entryId === destinationEntryId,
  );
  if (index === -1) return 0;

  const destination = entries[index];
  if (destination.kind !== "destination") return 0;

  const preceding = index > 0 ? entries[index - 1] : null;
  const walkMinutes =
    preceding && preceding.kind === "walk"
      ? scaleWalkMinutes(preceding.baseMinutes, speed)
      : 0;

  return walkMinutes + destination.dwellMinutes;
}

export function getDestinationIds(entries: PlannerEntry[]): string[] {
  return entries
    .filter((entry) => entry.kind === "destination")
    .map((entry) => entry.entryId);
}

/**
 * The `<`/`>` controls cycle strictly through destinations, wrapping at either end —
 * walk items are structural, not stops, so they are never a valid cursor position.
 */
export function getAdjacentDestinationId(
  entries: PlannerEntry[],
  currentEntryId: string | null,
  direction: 1 | -1,
): string | null {
  const ids = getDestinationIds(entries);
  if (ids.length === 0) return null;

  const currentIndex = currentEntryId ? ids.indexOf(currentEntryId) : -1;
  if (currentIndex === -1)
    return direction === 1 ? ids[0] : ids[ids.length - 1];

  const nextIndex = (currentIndex + direction + ids.length) % ids.length;
  return ids[nextIndex];
}

/**
 * Greedy nearest-neighbour routing for the "Recommend a schedule" wizard: starting at
 * the entrance, always walk to whichever selected must-see is currently closest. Good
 * enough to avoid an obviously backtracking route without pulling in a real solver for
 * what is, at most, six stops.
 */
export function buildRoutedDestinations(
  selectedAttractionIds: CatalogueAttractionId[],
): DestinationEntry[] {
  const remaining = new Set(selectedAttractionIds);
  const ordered: CatalogueAttractionId[] = [];
  let currentId: CatalogueAttractionId | typeof ENTRANCE_ID = ENTRANCE_ID;

  while (remaining.size > 0) {
    let nearestId: CatalogueAttractionId | null = null;
    let nearestMinutes = Number.POSITIVE_INFINITY;

    for (const candidateId of remaining) {
      const minutes = getBaseTransitMinutes(currentId, candidateId);
      if (minutes < nearestMinutes) {
        nearestMinutes = minutes;
        nearestId = candidateId;
      }
    }

    if (!nearestId) break;

    ordered.push(nearestId);
    remaining.delete(nearestId);
    currentId = nearestId;
  }

  return ordered.map((id) => createCatalogueDestination(id));
}

/**
 * The full "Recommend a schedule" behaviour: route every starred must-see first (as
 * `buildRoutedDestinations` does), then keep appending whichever remaining catalogue
 * attraction is nearest from wherever the route currently ends, as long as it still
 * fits inside what's left of the time budget — so a short must-see list doesn't leave
 * the rest of a generous day empty. Stops once nothing remaining both fits and hasn't
 * been visited.
 */
export function buildGeneratedItinerary(
  selectedAttractionIds: CatalogueAttractionId[],
  timeBudgetMinutes: number,
  speed: MobilitySpeed,
): DestinationEntry[] {
  const starred = buildRoutedDestinations(selectedAttractionIds);

  const visited = new Set<CatalogueAttractionId>(selectedAttractionIds);
  let currentId: CatalogueAttractionId | typeof ENTRANCE_ID = ENTRANCE_ID;
  let usedMinutes = 0;

  for (const destination of starred) {
    const attractionId = destination.attractionId as CatalogueAttractionId;
    usedMinutes += scaleWalkMinutes(
      getBaseTransitMinutes(currentId, attractionId),
      speed,
    );
    usedMinutes += destination.dwellMinutes;
    currentId = attractionId;
  }

  const filler: DestinationEntry[] = [];
  let remainingBudget = timeBudgetMinutes - usedMinutes;

  for (;;) {
    let bestId: CatalogueAttractionId | null = null;
    let bestWalkMinutes = Number.POSITIVE_INFINITY;
    let bestCost = 0;

    for (const attraction of CATALOGUE) {
      if (visited.has(attraction.id)) continue;

      const walkMinutes = scaleWalkMinutes(
        getBaseTransitMinutes(currentId, attraction.id),
        speed,
      );
      const cost = walkMinutes + attraction.dwellMinutes;
      if (cost > remainingBudget) continue;

      if (walkMinutes < bestWalkMinutes) {
        bestWalkMinutes = walkMinutes;
        bestId = attraction.id;
        bestCost = cost;
      }
    }

    if (!bestId) break;

    filler.push(createCatalogueDestination(bestId));
    visited.add(bestId);
    remainingBudget -= bestCost;
    currentId = bestId;
  }

  return [...starred, ...filler];
}
