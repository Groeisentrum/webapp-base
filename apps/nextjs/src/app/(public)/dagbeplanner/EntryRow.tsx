"use client";

import { Button } from "@/shared/components/ui";
import { cn } from "@/shared/lib/cn";
import { formatMinutesAsTime } from "@/shared/lib/dagbeplanner/engine";
import type {
  DestinationEntry,
  WalkEntry,
} from "@/shared/lib/dagbeplanner/types";
import { DelayBadge } from "@/app/(public)/dagbeplanner/WarningBanner";

/** Auto-walk items are system-generated and read-only — no remove button, no drag handle, no editor. */
export function WalkRow({
  entry,
  minutes,
  startMinutes,
  endMinutes,
}: {
  entry: WalkEntry;
  minutes: number;
  startMinutes: number;
  endMinutes: number;
}) {
  return (
    <li
      aria-label={`Stap ${minutes} minute na ${entry.toName}`}
      className="flex items-center gap-2 rounded-md py-1.5 pl-3 text-xs text-(--text-secondary)"
    >
      <span aria-hidden="true">🚶</span>
      <span className="italic">
        Stap na {entry.toName} — {minutes} min
      </span>
      <span className="ml-auto shrink-0 tabular-nums">
        {formatMinutesAsTime(startMinutes)}–{formatMinutesAsTime(endMinutes)}
      </span>
    </li>
  );
}

export function DestinationRow({
  entry,
  startMinutes,
  endMinutes,
  isActive,
  isPastCutoff,
  isFinalStop,
  closingTimeViolation,
  delayMinutes,
  onSelect,
  onRemove,
  onDwellChange,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isBeingDragged,
}: {
  entry: DestinationEntry;
  startMinutes: number;
  endMinutes: number;
  isActive: boolean;
  isPastCutoff: boolean;
  isFinalStop: boolean;
  closingTimeViolation: boolean;
  /** Minutes the real clock is past this stop's scheduled finish. 0 when on time — only ever nonzero for the active stop. */
  delayMinutes: number;
  onSelect: () => void;
  onRemove: () => void;
  onDwellChange: (minutes: number) => void;
  onDragStart: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  isBeingDragged: boolean;
}) {
  const isBehindSchedule = delayMinutes > 0;

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={cn(
        "flex cursor-grab flex-col gap-2 rounded-md border px-3 py-2.5 active:cursor-grabbing",
        isPastCutoff
          ? "border-(--state-warning) bg-(--state-warning-bg)"
          : "border-(--panel-border) bg-(--panel-bg)",
        isActive && "ring-2 ring-(--dagbeplanner-primary)",
        isBeingDragged && "opacity-40",
      )}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="shrink-0 text-(--text-secondary)">
          ⠿
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-(--text-primary)">
            {entry.name}
            {entry.isCustom && (
              <span className="ml-1.5 rounded bg-(--page-bg) px-1.5 py-0.5 text-[10px] font-normal text-(--text-secondary)">
                eie
              </span>
            )}
          </p>
          <p className="text-xs text-(--text-secondary)">
            {formatMinutesAsTime(startMinutes)} aankoms
          </p>
        </div>

        <label className="flex shrink-0 items-center gap-1 text-xs text-(--text-secondary)">
          <input
            type="number"
            min={5}
            step={5}
            value={entry.dwellMinutes}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => onDwellChange(Number(event.target.value))}
            aria-label={`Verblyftyd by ${entry.name} in minute`}
            className="w-14 rounded border border-(--panel-border) bg-(--panel-bg) px-1.5 py-1 text-right text-(--text-primary)"
          />
          min
        </label>

        <span
          className={cn(
            "shrink-0 tabular-nums text-xs font-semibold",
            isFinalStop && closingTimeViolation
              ? "text-(--state-critical)"
              : "text-(--text-secondary)",
          )}
        >
          {formatMinutesAsTime(endMinutes)}
        </span>

        <Button
          variant="ghost"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          aria-label={`Verwyder ${entry.name}`}
          className="shrink-0 px-2"
        >
          &times;
        </Button>
      </div>

      {isBehindSchedule && (
        <div
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-md px-2.5 py-2",
            closingTimeViolation
              ? "bg-(--state-critical-bg)"
              : "bg-(--state-warning-bg)",
          )}
        >
          <DelayBadge
            delayMinutes={delayMinutes}
            severity={closingTimeViolation ? "critical" : "warning"}
          />
          <span className="text-xs text-(--text-secondary)">
            Lengte aanpas:
          </span>
          <button
            type="button"
            onClick={() => onDwellChange(entry.dwellMinutes + 5)}
            className="rounded border border-(--panel-border) bg-(--panel-bg) px-2.5 py-1.5 text-xs font-medium text-(--text-primary) hover:border-(--dagbeplanner-primary)"
          >
            +5m
          </button>
          <button
            type="button"
            onClick={() => onDwellChange(entry.dwellMinutes + 15)}
            className="rounded border border-(--panel-border) bg-(--panel-bg) px-2.5 py-1.5 text-xs font-medium text-(--text-primary) hover:border-(--dagbeplanner-primary)"
          >
            +15m
          </button>
          <button
            type="button"
            onClick={() => onDwellChange(entry.dwellMinutes + delayMinutes)}
            className="rounded border border-(--panel-border) bg-(--panel-bg) px-2.5 py-1.5 text-xs font-medium text-(--text-primary) hover:border-(--dagbeplanner-primary)"
          >
            Pas by huidige tyd
          </button>
        </div>
      )}
    </li>
  );
}
