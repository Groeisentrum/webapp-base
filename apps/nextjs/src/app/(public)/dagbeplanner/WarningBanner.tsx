import { cn } from "@/shared/lib/cn";
import { formatMinutesAsTime } from "@/shared/lib/dagbeplanner/engine";
import type { BudgetTier } from "@/shared/lib/dagbeplanner/types";

/**
 * The 3-tier badge: green when under budget, orange once over it. A closing-time
 * violation (Tier 3) overrides the badge's colour entirely — running past the gate
 * closure matters more than whether the visitor also has spare time on paper.
 */
export function TierBadge({
  tier,
  bufferMinutes,
  closingTimeViolation,
  className,
}: {
  tier: BudgetTier;
  bufferMinutes: number;
  closingTimeViolation: boolean;
  className?: string;
}) {
  if (closingTimeViolation) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-(--state-critical-bg) px-2.5 py-1 text-xs font-semibold text-(--state-critical)",
          className,
        )}
      >
        Ná sluitingstyd
      </span>
    );
  }

  if (tier === "onTrack") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-(--state-success-bg) px-2.5 py-1 text-xs font-semibold text-(--state-success)",
          className,
        )}
      >
        +{bufferMinutes}m speling
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-(--state-warning-bg) px-2.5 py-1 text-xs font-semibold text-(--state-warning)",
        className,
      )}
    >
      {Math.abs(bufferMinutes)}m te veel
    </span>
  );
}

/**
 * "Running behind schedule" badge — compares the real clock against a stop's scheduled
 * finish. Amber while the day can still absorb the delay (personal soft-budget tone);
 * red only once the delay has actually pushed the plan's finish past the 17:00 gate
 * closure, per the strict red = closure-or-destructive rule.
 */
export function DelayBadge({
  delayMinutes,
  severity,
  className,
}: {
  delayMinutes: number;
  severity: "warning" | "critical";
  className?: string;
}) {
  const toneClasses =
    severity === "critical"
      ? "bg-(--state-critical-bg) text-(--state-critical)"
      : "bg-(--state-warning-bg) text-(--state-warning)";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        toneClasses,
        className,
      )}
    >
      +{delayMinutes}m laat
    </span>
  );
}

/** Tier 3: a high-contrast, solid-fill banner — deliberately louder than the badge above it. */
export function ClosingTimeBanner({
  finishTimeMinutes,
}: {
  finishTimeMinutes: number;
}) {
  return (
    <div
      role="alert"
      className="rounded-md bg-(--state-critical) px-4 py-3 text-sm font-semibold text-(--text-inverse)"
    >
      ⚠ Hierdie plan eindig om {formatMinutesAsTime(finishTimeMinutes)} — ná die
      hek se sluitingstyd (17:00). Kort die tyd in of verwyder &rsquo;n
      aktiwiteit.
    </div>
  );
}

/** Rendered as a list item, inline with the itinerary, at the point the time budget runs out. */
export function CutoffLine({
  budgetTimeMinutes,
}: {
  budgetTimeMinutes: number;
}) {
  return (
    <li aria-hidden="true" className="my-1 flex items-center gap-2 py-1">
      <span className="h-0 flex-1 border-t-2 border-dashed border-(--state-warning)" />
      <span className="shrink-0 text-[11px] font-semibold text-(--state-warning)">
        Begroting bereik · {formatMinutesAsTime(budgetTimeMinutes)}
      </span>
      <span className="h-0 flex-1 border-t-2 border-dashed border-(--state-warning)" />
    </li>
  );
}
