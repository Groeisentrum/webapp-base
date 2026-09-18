import { describe, expect, it } from "vitest";
import {
  buildGeneratedItinerary,
  buildRoutedDestinations,
  computeBudgetSummary,
  computeSchedule,
  createCatalogueDestination,
  createCustomDestination,
  getAdjacentDestinationId,
  getDefaultStartTime,
  getDelayMinutes,
  getDestinationIds,
  getDestinationMinutesLeft,
  getMinutesSinceMidnight,
  parseTimeToMinutes,
  recomputeWalkChain,
  scaleWalkMinutes,
} from "@/shared/lib/dagbeplanner/engine";
import type {
  DestinationEntry,
  PlannerEntry,
  WalkEntry,
} from "@/shared/lib/dagbeplanner/types";

describe("scaleWalkMinutes", () => {
  it("applies the mobility profile multipliers", () => {
    expect(scaleWalkMinutes(10, "fast")).toBe(8); // 7.5 rounds to 8
    expect(scaleWalkMinutes(10, "medium")).toBe(10);
    expect(scaleWalkMinutes(10, "slow")).toBe(15);
    expect(scaleWalkMinutes(10, "wheelchair")).toBe(20);
  });

  it("never rounds a nonzero walk down to zero minutes", () => {
    expect(scaleWalkMinutes(1, "fast")).toBe(1);
  });
});

describe("recomputeWalkChain", () => {
  it("prepends an auto-walk item before every catalogue destination", () => {
    const destinations = [
      createCatalogueDestination("heritage-centre"),
      createCatalogueDestination("cenotaph-hall"),
    ];

    const entries = recomputeWalkChain(destinations);

    expect(entries.map((entry) => entry.kind)).toEqual([
      "walk",
      "destination",
      "walk",
      "destination",
    ]);
  });

  it("never generates a walk item for a custom activity", () => {
    const destinations = [
      createCatalogueDestination("heritage-centre"),
      createCustomDestination("Middagete", 30),
    ];

    const entries = recomputeWalkChain(destinations);

    expect(entries.map((entry) => entry.kind)).toEqual([
      "walk",
      "destination",
      "destination",
    ]);
  });

  it("routes the next catalogue walk from the last real location, skipping over custom activities", () => {
    const destinations = [
      createCatalogueDestination("heritage-centre"),
      createCustomDestination("Middagete", 30),
      createCatalogueDestination("monument-restaurant"),
    ];

    const entries = recomputeWalkChain(destinations);
    const walksToRestaurant = entries.filter(
      (entry): entry is WalkEntry =>
        entry.kind === "walk" && entry.toName === "Monument-restaurant",
    );

    expect(walksToRestaurant).toHaveLength(1);
    expect(walksToRestaurant[0].fromName).toBe("Erfenissentrum");
  });

  it("re-derives the chain from scratch, so a stale walk item can never survive a reorder", () => {
    const destinations = [
      createCatalogueDestination("fort-schanskop"),
      createCatalogueDestination("heritage-centre"),
    ];

    const reordered = [destinations[1], destinations[0]];
    const entries = recomputeWalkChain(reordered);
    const firstWalk = entries[0] as WalkEntry;

    expect(firstWalk.toName).toBe("Erfenissentrum");
    expect(firstWalk.fromName).toBe("Hoofingang");
  });
});

describe("getDestinationMinutesLeft — transit bundling", () => {
  it("bundles the preceding walk item with the destination's own dwell time", () => {
    const walk: WalkEntry = {
      kind: "walk",
      entryId: "walk-1",
      baseMinutes: 2,
      fromName: "A",
      toName: "Cenotaph Hall",
    };
    const destination: DestinationEntry = {
      kind: "destination",
      entryId: "dest-1",
      attractionId: "cenotaph-hall",
      name: "Cenotaph Hall",
      dwellMinutes: 5,
      isCustom: false,
    };
    const entries: PlannerEntry[] = [walk, destination];

    // 2m walk + 5m stay, exactly the spec's worked example.
    expect(getDestinationMinutesLeft(entries, "dest-1", "medium")).toBe(7);
  });

  it("counts only the dwell time when nothing precedes the destination", () => {
    const destination: DestinationEntry = {
      kind: "destination",
      entryId: "dest-1",
      attractionId: null,
      name: "Middagete",
      dwellMinutes: 30,
      isCustom: true,
    };

    expect(getDestinationMinutesLeft([destination], "dest-1", "medium")).toBe(
      30,
    );
  });

  it("scales the bundled walk time with the active mobility speed", () => {
    const walk: WalkEntry = {
      kind: "walk",
      entryId: "walk-1",
      baseMinutes: 4,
      fromName: "A",
      toName: "B",
    };
    const destination: DestinationEntry = {
      kind: "destination",
      entryId: "dest-1",
      attractionId: "fort-schanskop",
      name: "Fort Schanskop",
      dwellMinutes: 10,
      isCustom: false,
    };
    const entries: PlannerEntry[] = [walk, destination];

    expect(getDestinationMinutesLeft(entries, "dest-1", "wheelchair")).toBe(
      8 + 10,
    );
  });
});

describe("navigation skipping", () => {
  it("cycles the < / > controls across destinations only, skipping walk items", () => {
    const destinations = [
      createCatalogueDestination("heritage-centre"),
      createCatalogueDestination("cenotaph-hall"),
      createCatalogueDestination("fort-schanskop"),
    ];
    const entries = recomputeWalkChain(destinations);
    const ids = getDestinationIds(entries);

    expect(ids).toHaveLength(3);

    const second = getAdjacentDestinationId(entries, ids[0], 1);
    expect(second).toBe(ids[1]);

    const third = getAdjacentDestinationId(entries, second, 1);
    expect(third).toBe(ids[2]);

    // Wraps around rather than stopping dead at the last destination.
    const wrapped = getAdjacentDestinationId(entries, third, 1);
    expect(wrapped).toBe(ids[0]);

    const backwardsWrap = getAdjacentDestinationId(entries, ids[0], -1);
    expect(backwardsWrap).toBe(ids[2]);
  });
});

describe("computeBudgetSummary — 3-tier warning hierarchy", () => {
  it("Tier 1: reports onTrack with a positive buffer when under budget and before closing", () => {
    const destinations = [createCatalogueDestination("heritage-centre")];
    const start = parseTimeToMinutes("09:30");
    const scheduled = computeSchedule(destinations, start, "medium");

    const summary = computeBudgetSummary(scheduled, start, 180);

    expect(summary.tier).toBe("onTrack");
    expect(summary.bufferMinutes).toBeGreaterThan(0);
    expect(summary.closingTimeViolation).toBe(false);
    expect(summary.cutoffEntryId).toBeNull();
  });

  it("Tier 2: flips to softOverBudget and marks a cutoff entry once elapsed time exceeds the budget", () => {
    const destinations = [
      createCatalogueDestination("heritage-centre"),
      createCatalogueDestination("monument-restaurant"),
      createCatalogueDestination("cenotaph-hall"),
    ];
    const start = parseTimeToMinutes("09:30");
    const scheduled = computeSchedule(destinations, start, "medium");

    // Tight budget that the third stop must blow through.
    const summary = computeBudgetSummary(scheduled, start, 20);

    expect(summary.tier).toBe("softOverBudget");
    expect(summary.bufferMinutes).toBeLessThan(0);
    expect(summary.cutoffEntryId).not.toBeNull();
  });

  it("Tier 3: flags a closing-time violation independently of the budget tier", () => {
    const destinations = [createCatalogueDestination("heritage-centre")];
    // Starting at 16:50 with a huge budget still runs past the 17:00 gate closure.
    const start = parseTimeToMinutes("16:50");
    const scheduled = computeSchedule(destinations, start, "medium");

    const summary = computeBudgetSummary(scheduled, start, 600);

    expect(summary.tier).toBe("onTrack");
    expect(summary.closingTimeViolation).toBe(true);
  });
});

describe("buildRoutedDestinations", () => {
  it("routes every selected must-see exactly once", () => {
    const routed = buildRoutedDestinations([
      "fort-schanskop",
      "heritage-centre",
      "monument-restaurant",
    ]);

    expect(routed.map((entry) => entry.attractionId).sort()).toEqual(
      ["fort-schanskop", "heritage-centre", "monument-restaurant"].sort(),
    );
  });

  it("visits the nearest unvisited stop first, avoiding an obvious backtrack", () => {
    // Heritage Centre and the restaurant are both near the entrance and each other;
    // Fort Schanskop is far out. The greedy route should clear the near cluster first.
    const routed = buildRoutedDestinations([
      "fort-schanskop",
      "heritage-centre",
      "monument-restaurant",
    ]);

    expect(routed[0].attractionId).not.toBe("fort-schanskop");
    expect(routed[routed.length - 1].attractionId).toBe("fort-schanskop");
  });
});

describe("getDefaultStartTime", () => {
  it("rounds up to the next quarter hour during the day", () => {
    expect(getDefaultStartTime(new Date(2026, 0, 1, 10, 18))).toBe("10:30");
  });

  it("leaves an exact quarter hour unchanged", () => {
    expect(getDefaultStartTime(new Date(2026, 0, 1, 8, 0))).toBe("08:00");
  });

  it("defaults to opening time before the gate opens", () => {
    expect(getDefaultStartTime(new Date(2026, 0, 1, 7, 0))).toBe("08:00");
  });

  it("defaults to opening time after closing", () => {
    expect(getDefaultStartTime(new Date(2026, 0, 1, 18, 0))).toBe("08:00");
  });

  it("defaults to opening time once too little of the day remains to round into", () => {
    expect(getDefaultStartTime(new Date(2026, 0, 1, 16, 45))).toBe("08:00");
  });

  it("rounds to itself at the last valid rounding boundary", () => {
    expect(getDefaultStartTime(new Date(2026, 0, 1, 16, 30))).toBe("16:30");
  });
});

describe("buildGeneratedItinerary — auto-fill remaining budget", () => {
  it("routes every starred must-see, exactly as buildRoutedDestinations would", () => {
    const generated = buildGeneratedItinerary(
      ["fort-schanskop", "heritage-centre"],
      30,
      "medium",
    );

    expect(generated[0].attractionId).toBe("heritage-centre");
    expect(
      generated.some((entry) => entry.attractionId === "fort-schanskop"),
    ).toBe(true);
  });

  it("fills the remaining budget with additional catalogue stops once the starred ones fit easily", () => {
    // A single short starred stop inside a big budget should leave the day mostly empty
    // without the auto-fill — this asserts it isn't.
    const generated = buildGeneratedItinerary(
      ["heritage-centre"],
      300,
      "medium",
    );

    expect(generated.length).toBeGreaterThan(1);
    expect(generated.filter((entry) => entry.isCustom)).toHaveLength(0);
  });

  it("never exceeds the time budget", () => {
    const generated = buildGeneratedItinerary(
      ["heritage-centre"],
      60,
      "medium",
    );
    const schedule = computeSchedule(
      generated,
      parseTimeToMinutes("09:00"),
      "medium",
    );
    const summary = computeBudgetSummary(
      schedule,
      parseTimeToMinutes("09:00"),
      60,
    );

    expect(summary.totalElapsedMinutes).toBeLessThanOrEqual(60);
  });

  it("adds nothing extra when the starred selection already exhausts the budget", () => {
    const generated = buildGeneratedItinerary(
      ["monument-restaurant"],
      45,
      "medium",
    );

    expect(generated).toHaveLength(1);
  });

  it("never schedules the same attraction twice", () => {
    const generated = buildGeneratedItinerary(
      ["fort-schanskop"],
      600,
      "medium",
    );
    const attractionIds = generated.map((entry) => entry.attractionId);

    expect(new Set(attractionIds).size).toBe(attractionIds.length);
  });
});

describe("getMinutesSinceMidnight", () => {
  it("converts a Date's local time to minutes since midnight", () => {
    expect(getMinutesSinceMidnight(new Date(2026, 0, 1, 10, 18))).toBe(618);
    expect(getMinutesSinceMidnight(new Date(2026, 0, 1, 0, 0))).toBe(0);
  });
});

describe("getDelayMinutes — behind-schedule detection", () => {
  it("reports zero while still on time or early", () => {
    expect(getDelayMinutes(600, 590)).toBe(0);
    expect(getDelayMinutes(600, 600)).toBe(0);
  });

  it("reports the exact overrun once the real clock passes the scheduled finish", () => {
    // Scheduled to finish at 10:00 (600), it's actually 10:20 (620) — 20 minutes late.
    expect(getDelayMinutes(600, 620)).toBe(20);
  });
});
