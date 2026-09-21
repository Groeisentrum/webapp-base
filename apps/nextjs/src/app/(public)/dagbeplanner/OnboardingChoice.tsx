"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/shared/components/ui";
import {
  DEFAULT_TIME_BUDGET_MINUTES,
  getDefaultStartTime,
} from "@/shared/lib/dagbeplanner/engine";
import { useDagbeplannerStore } from "@/shared/stores/useDagbeplannerStore";
import { SpeedSelector } from "@/app/(public)/dagbeplanner/SpeedSelector";

const BUDGET_OPTIONS_MINUTES = [60, 90, 120, 180, 240, 300];

function formatBudgetOption(minutes: number): string {
  const hours = minutes / 60;
  const label = Number.isInteger(hours)
    ? `${hours}`
    : hours.toString().replace(".", ",");
  const unit = hours > 1 ? "ure" : "uur";

  return `${label} ${unit}`;
}

/** The empty-state fork: recommend a routed schedule, or start from a blank timeline. */
export function OnboardingChoice() {
  const speed = useDagbeplannerStore((state) => state.speed);
  const setSpeed = useDagbeplannerStore((state) => state.setSpeed);
  const openWizard = useDagbeplannerStore((state) => state.openWizard);
  const startManualPlan = useDagbeplannerStore(
    (state) => state.startManualPlan,
  );

  // Lazy initializer: read the device clock once, on first render, not on every one.
  const [startTime, setStartTime] = useState(() => getDefaultStartTime());
  const [timeBudgetMinutes, setTimeBudgetMinutes] = useState(
    DEFAULT_TIME_BUDGET_MINUTES,
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-(--text-primary)">
          Beplan jou besoek
        </h3>
        <p className="mt-1 text-xs text-(--text-secondary)">
          Stel jou begintyd en beskikbare tyd, kies dan hoe jy wil begin.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Begintyd" htmlFor="onboarding-start-time">
          <Input
            id="onboarding-start-time"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
        </Field>
        <Field label="Tydbegroting" htmlFor="onboarding-budget">
          <Select
            id="onboarding-budget"
            value={timeBudgetMinutes}
            onChange={(event) =>
              setTimeBudgetMinutes(Number(event.target.value))
            }
          >
            {BUDGET_OPTIONS_MINUTES.map((minutes) => (
              <option key={minutes} value={minutes}>
                {formatBudgetOption(minutes)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <SpeedSelector value={speed} onChange={setSpeed} />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {/* Primary path: the recommended, lower-effort way to start. */}
        <button
          type="button"
          onClick={() => openWizard(startTime, timeBudgetMinutes)}
          className="rounded-lg bg-(--dagbeplanner-primary) p-3 text-left text-(--text-inverse) transition hover:opacity-90"
        >
          <span className="block text-sm font-semibold">
            Beveel &rsquo;n skedule aan
          </span>
          <span className="mt-1 block text-xs">
            Kies jou moet-sien plekke — ons rangskik dit en vul die orige tyd.
          </span>
        </button>
        {/* Secondary path: available, but visually subordinate to the recommendation above. */}
        <button
          type="button"
          onClick={() => startManualPlan(startTime, timeBudgetMinutes)}
          className="rounded-lg border border-(--panel-border) bg-(--panel-bg) p-3 text-left text-(--text-primary) transition hover:border-(--dagbeplanner-primary) hover:bg-(--page-bg)"
        >
          <span className="block text-sm font-semibold">Bou self</span>
          <span className="mt-1 block text-xs text-(--text-secondary)">
            Begin met &rsquo;n leë tydlyn en voeg self plekke by.
          </span>
        </button>
      </div>
    </div>
  );
}
