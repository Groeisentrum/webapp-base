"use client";

import { useMemo, useState } from "react";
import { Button, Field, Input } from "@/shared/components/ui";
import { useLiveClock } from "@/shared/hooks/useLiveClock";
import {
  computeBudgetSummary,
  computeSchedule,
  formatMinutesAsTime,
  getDelayMinutes,
  getMinutesSinceMidnight,
  parseTimeToMinutes,
} from "@/shared/lib/dagbeplanner/engine";
import { buildShareUrl } from "@/shared/lib/dagbeplanner/share";
import { useDagbeplannerStore } from "@/shared/stores/useDagbeplannerStore";
import { AddEntryControls } from "@/app/(public)/dagbeplanner/AddEntryControls";
import { DestinationRow, WalkRow } from "@/app/(public)/dagbeplanner/EntryRow";
import { SpeedSelector } from "@/app/(public)/dagbeplanner/SpeedSelector";
import {
  ClosingTimeBanner,
  CutoffLine,
  TierBadge,
} from "@/app/(public)/dagbeplanner/WarningBanner";

/**
 * The full itinerary view: timeline, budgeting, the 3-tier warning hierarchy, and every
 * edit control. Rendered identically inside the mobile bottom sheet and the desktop
 * squeeze sidebar — the two "views" the spec describes are really one component in two
 * different shells.
 */
export function ItineraryPanel() {
  const destinations = useDagbeplannerStore((state) => state.destinations);
  const startTime = useDagbeplannerStore((state) => state.startTime);
  const timeBudgetMinutes = useDagbeplannerStore(
    (state) => state.timeBudgetMinutes,
  );
  const speed = useDagbeplannerStore((state) => state.speed);
  const activeDestinationId = useDagbeplannerStore(
    (state) => state.activeDestinationId,
  );

  const setStartTime = useDagbeplannerStore((state) => state.setStartTime);
  const setTimeBudgetMinutes = useDagbeplannerStore(
    (state) => state.setTimeBudgetMinutes,
  );
  const setSpeed = useDagbeplannerStore((state) => state.setSpeed);
  const setActiveDestinationId = useDagbeplannerStore(
    (state) => state.setActiveDestinationId,
  );
  const removeDestination = useDagbeplannerStore(
    (state) => state.removeDestination,
  );
  const updateDwellMinutes = useDagbeplannerStore(
    (state) => state.updateDwellMinutes,
  );
  const reorderDestinations = useDagbeplannerStore(
    (state) => state.reorderDestinations,
  );
  const requestClearPlan = useDagbeplannerStore(
    (state) => state.requestClearPlan,
  );
  const openWizard = useDagbeplannerStore((state) => state.openWizard);
  const openShareModal = useDagbeplannerStore((state) => state.openShareModal);

  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);

  const now = useLiveClock();
  const currentMinutes = getMinutesSinceMidnight(now);

  const startTimeMinutes = parseTimeToMinutes(startTime);
  const scheduled = useMemo(
    () => computeSchedule(destinations, startTimeMinutes, speed),
    [destinations, startTimeMinutes, speed],
  );
  const budgetSummary = useMemo(
    () => computeBudgetSummary(scheduled, startTimeMinutes, timeBudgetMinutes),
    [scheduled, startTimeMinutes, timeBudgetMinutes],
  );

  const cutoffIndex = budgetSummary.cutoffEntryId
    ? scheduled.findIndex(
        (item) => item.entry.entryId === budgetSummary.cutoffEntryId,
      )
    : -1;
  const lastScheduledIndex = scheduled.length - 1;

  const handleShareClick = async () => {
    const shareUrl = buildShareUrl({
      startTime,
      timeBudgetMinutes,
      speed,
      destinations,
    });

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "My VTM-dagplan", url: shareUrl });
      } catch {
        // AbortError on user cancel — not a failure worth surfacing.
      }
      return;
    }

    openShareModal();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-(--text-primary)">
            Jou dagplan
          </h3>
          <p className="text-xs text-(--text-secondary)">
            Klaar om {formatMinutesAsTime(budgetSummary.finishTimeMinutes)} ·{" "}
            {
              scheduled.filter((item) => item.entry.kind === "destination")
                .length
            }{" "}
            stop(pe)
          </p>
        </div>
        <TierBadge
          tier={budgetSummary.tier}
          bufferMinutes={budgetSummary.bufferMinutes}
          closingTimeViolation={budgetSummary.closingTimeViolation}
        />
      </div>

      {budgetSummary.closingTimeViolation && (
        <ClosingTimeBanner
          finishTimeMinutes={budgetSummary.finishTimeMinutes}
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Begintyd" htmlFor="dagbeplanner-start-time">
          <Input
            id="dagbeplanner-start-time"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
        </Field>
        <Field label="Tydbegroting (min)" htmlFor="dagbeplanner-budget">
          <Input
            id="dagbeplanner-budget"
            type="number"
            min={15}
            step={15}
            value={timeBudgetMinutes}
            onChange={(event) =>
              setTimeBudgetMinutes(Number(event.target.value))
            }
          />
        </Field>
      </div>

      <SpeedSelector value={speed} onChange={setSpeed} />

      {scheduled.length === 0 ? (
        <p className="rounded-md border border-dashed border-(--panel-border) px-4 py-6 text-center text-sm text-(--text-secondary)">
          Nog geen stoppe nie — voeg &rsquo;n besienswaardigheid hieronder by.
        </p>
      ) : (
        <ol className="flex flex-col gap-1">
          {scheduled.flatMap((scheduledEntry, index) => {
            const isPastCutoff = cutoffIndex !== -1 && index >= cutoffIndex;
            const rows: React.ReactNode[] = [];

            if (index === cutoffIndex) {
              rows.push(
                <CutoffLine
                  key="cutoff-line"
                  budgetTimeMinutes={startTimeMinutes + timeBudgetMinutes}
                />,
              );
            }

            rows.push(
              scheduledEntry.entry.kind === "walk" ? (
                <WalkRow
                  key={scheduledEntry.entry.entryId}
                  entry={scheduledEntry.entry}
                  minutes={
                    scheduledEntry.endMinutes - scheduledEntry.startMinutes
                  }
                  startMinutes={scheduledEntry.startMinutes}
                  endMinutes={scheduledEntry.endMinutes}
                />
              ) : (
                <DestinationRow
                  key={scheduledEntry.entry.entryId}
                  entry={scheduledEntry.entry}
                  startMinutes={scheduledEntry.startMinutes}
                  endMinutes={scheduledEntry.endMinutes}
                  isActive={
                    scheduledEntry.entry.entryId === activeDestinationId
                  }
                  isPastCutoff={isPastCutoff}
                  isFinalStop={index === lastScheduledIndex}
                  closingTimeViolation={budgetSummary.closingTimeViolation}
                  // Only the active stop shows a delay — that's the one the visitor is
                  // "on or viewing" per the spec, not every already-passed row.
                  delayMinutes={
                    scheduledEntry.entry.entryId === activeDestinationId
                      ? getDelayMinutes(
                          scheduledEntry.endMinutes,
                          currentMinutes,
                        )
                      : 0
                  }
                  onSelect={() =>
                    setActiveDestinationId(scheduledEntry.entry.entryId)
                  }
                  onRemove={() =>
                    removeDestination(scheduledEntry.entry.entryId)
                  }
                  onDwellChange={(minutes) =>
                    updateDwellMinutes(scheduledEntry.entry.entryId, minutes)
                  }
                  isBeingDragged={
                    draggedEntryId === scheduledEntry.entry.entryId
                  }
                  onDragStart={() =>
                    setDraggedEntryId(scheduledEntry.entry.entryId)
                  }
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggedEntryId)
                      reorderDestinations(
                        draggedEntryId,
                        scheduledEntry.entry.entryId,
                      );
                    setDraggedEntryId(null);
                  }}
                  onDragEnd={() => setDraggedEntryId(null)}
                />
              ),
            );

            return rows;
          })}
        </ol>
      )}

      <AddEntryControls />

      <div className="flex flex-wrap gap-2 border-t border-(--panel-border) pt-3">
        <Button
          variant="secondary"
          onClick={() => openWizard(startTime, timeBudgetMinutes)}
        >
          Genereer weer
        </Button>
        <Button variant="secondary" onClick={requestClearPlan}>
          Maak skoon
        </Button>
        <Button
          variant="primary"
          onClick={handleShareClick}
          className="ml-auto bg-(--dagbeplanner-primary)"
        >
          Stoor / Deel
        </Button>
      </div>
    </div>
  );
}
