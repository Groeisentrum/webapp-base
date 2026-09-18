"use client";

import { useMemo } from "react";
import { useLiveClock } from "@/shared/hooks/useLiveClock";
import {
  computeBudgetSummary,
  computeSchedule,
  getDelayMinutes,
  getDestinationMinutesLeft,
  getMinutesSinceMidnight,
  parseTimeToMinutes,
  recomputeWalkChain,
} from "@/shared/lib/dagbeplanner/engine";
import { useDagbeplannerStore } from "@/shared/stores/useDagbeplannerStore";
import {
  DelayBadge,
  TierBadge,
} from "@/app/(public)/dagbeplanner/WarningBanner";

/**
 * The collapsed mobile footer: 3 zones — `<`/`>` on the left, the active destination's
 * bundled time-left in the centre, a tier badge on the right. Tapping anywhere except
 * the two nav buttons expands the drawer (the buttons stop propagation so they don't
 * also trigger that).
 */
export function MobileBar() {
  const status = useDagbeplannerStore((state) => state.status);
  const destinations = useDagbeplannerStore((state) => state.destinations);
  const startTime = useDagbeplannerStore((state) => state.startTime);
  const timeBudgetMinutes = useDagbeplannerStore(
    (state) => state.timeBudgetMinutes,
  );
  const speed = useDagbeplannerStore((state) => state.speed);
  const activeDestinationId = useDagbeplannerStore(
    (state) => state.activeDestinationId,
  );
  const openDrawer = useDagbeplannerStore((state) => state.openDrawer);
  const cycleActiveDestination = useDagbeplannerStore(
    (state) => state.cycleActiveDestination,
  );

  const now = useLiveClock();

  const entries = useMemo(
    () => recomputeWalkChain(destinations),
    [destinations],
  );
  const startTimeMinutes = parseTimeToMinutes(startTime);
  const scheduled = useMemo(
    () => computeSchedule(destinations, startTimeMinutes, speed),
    [destinations, startTimeMinutes, speed],
  );
  const budgetSummary = useMemo(
    () => computeBudgetSummary(scheduled, startTimeMinutes, timeBudgetMinutes),
    [scheduled, startTimeMinutes, timeBudgetMinutes],
  );

  if (status === "uninitialized") return null;

  if (status === "empty" || destinations.length === 0) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 shadow-[0_-8px_30px_-4px_rgba(0,0,0,0.35)] ring-1 ring-black/10 lg:hidden">
        <button
          type="button"
          onClick={openDrawer}
          className="flex min-h-11 w-full items-center justify-center gap-2 bg-(--dagbeplanner-primary) px-4 py-3 text-sm font-semibold text-(--text-inverse)"
        >
          <span aria-hidden="true">📅</span> Beplan jou besoek
        </button>
      </div>
    );
  }

  const activeDestination = activeDestinationId
    ? destinations.find(
        (destination) => destination.entryId === activeDestinationId,
      )
    : undefined;
  const minutesLeft = activeDestinationId
    ? getDestinationMinutesLeft(entries, activeDestinationId, speed)
    : 0;

  const activeScheduledEntry = activeDestinationId
    ? scheduled.find((item) => item.entry.entryId === activeDestinationId)
    : undefined;
  const delayMinutes = activeScheduledEntry
    ? getDelayMinutes(
        activeScheduledEntry.endMinutes,
        getMinutesSinceMidnight(now),
      )
    : 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-(--panel-border) bg-(--panel-bg) shadow-[0_-8px_30px_-4px_rgba(0,0,0,0.35)] ring-1 ring-black/10 lg:hidden">
      <button
        type="button"
        onClick={openDrawer}
        aria-label="Wys volledige dagplan"
        className="flex min-h-14 w-full items-center gap-1 px-1.5 py-2"
      >
        <span className="flex shrink-0 items-center gap-1">
          <span
            role="button"
            tabIndex={0}
            aria-label="Vorige bestemming"
            onClick={(event) => {
              event.stopPropagation();
              cycleActiveDestination(-1);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.stopPropagation();
                cycleActiveDestination(-1);
              }
            }}
            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-md p-2.5 text-xl font-medium text-(--text-secondary) hover:bg-(--page-bg) active:bg-(--page-bg)"
          >
            ‹
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label="Volgende bestemming"
            onClick={(event) => {
              event.stopPropagation();
              cycleActiveDestination(1);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.stopPropagation();
                cycleActiveDestination(1);
              }
            }}
            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-md p-2.5 text-xl font-medium text-(--text-secondary) hover:bg-(--page-bg) active:bg-(--page-bg)"
          >
            ›
          </span>
        </span>

        <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-(--text-primary)">
          {activeDestination?.name ?? "—"}{" "}
          <span className="text-(--text-secondary)">({minutesLeft}m oor)</span>
        </span>

        {delayMinutes > 0 ? (
          <DelayBadge
            delayMinutes={delayMinutes}
            severity={
              budgetSummary.closingTimeViolation ? "critical" : "warning"
            }
            className="shrink-0"
          />
        ) : (
          <TierBadge
            tier={budgetSummary.tier}
            bufferMinutes={budgetSummary.bufferMinutes}
            closingTimeViolation={budgetSummary.closingTimeViolation}
            className="shrink-0"
          />
        )}
      </button>
    </div>
  );
}
