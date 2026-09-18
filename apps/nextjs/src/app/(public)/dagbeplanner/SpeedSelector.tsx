"use client";

import { Field, Select } from "@/shared/components/ui";
import { SPEED_LABELS } from "@/shared/lib/dagbeplanner/engine";
import type { MobilitySpeed } from "@/shared/lib/dagbeplanner/types";

const SPEED_ORDER: MobilitySpeed[] = ["fast", "medium", "slow", "wheelchair"];

/** Adjusting this instantly rescales every auto-walk item's duration — see engine.ts's SPEED_MULTIPLIERS. */
export function SpeedSelector({
  value,
  onChange,
}: {
  value: MobilitySpeed;
  onChange: (speed: MobilitySpeed) => void;
}) {
  return (
    <Field
      label="Loopspoed"
      htmlFor="dagbeplanner-speed"
      hint="Pas outomaties elke stap-tyd in jou plan aan."
    >
      <Select
        id="dagbeplanner-speed"
        value={value}
        onChange={(event) => onChange(event.target.value as MobilitySpeed)}
      >
        {SPEED_ORDER.map((speed) => (
          <option key={speed} value={speed}>
            {SPEED_LABELS[speed]}
          </option>
        ))}
      </Select>
    </Field>
  );
}
