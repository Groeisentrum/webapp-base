"use client";

import { useState } from "react";
import { Button, Field, Input } from "@/shared/components/ui";
import { CATALOGUE } from "@/shared/lib/dagbeplanner/catalogue";
import { useDagbeplannerStore } from "@/shared/stores/useDagbeplannerStore";

/**
 * Scheduling a catalogue attraction here is what triggers the auto-walk item (see
 * `addCatalogueAttraction` in the store, which always regenerates the walk chain).
 * A custom activity never does — it is simply appended with no transit leg.
 */
export function AddEntryControls() {
  const addCatalogueAttraction = useDagbeplannerStore(
    (state) => state.addCatalogueAttraction,
  );
  const addCustomActivity = useDagbeplannerStore(
    (state) => state.addCustomActivity,
  );

  const [customName, setCustomName] = useState("");
  const [customMinutes, setCustomMinutes] = useState(30);

  const handleAddCustom = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = customName.trim();
    if (!trimmed) return;

    addCustomActivity(trimmed, customMinutes);
    setCustomName("");
    setCustomMinutes(30);
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed border-(--panel-border) p-3">
      <div>
        <p className="mb-1.5 text-xs font-semibold tracking-wide text-(--text-secondary) uppercase">
          Voeg &rsquo;n besienswaardigheid by
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CATALOGUE.map((attraction) => (
            <button
              key={attraction.id}
              type="button"
              onClick={() => addCatalogueAttraction(attraction.id)}
              className="rounded-full border border-(--panel-border) bg-(--panel-bg) px-3 py-1.5 text-xs font-medium text-(--text-primary) hover:border-(--dagbeplanner-primary) hover:text-(--dagbeplanner-primary)"
            >
              + {attraction.name}
            </button>
          ))}
        </div>
      </div>

      <form
        onSubmit={handleAddCustom}
        className="flex flex-wrap items-end gap-2"
      >
        <div className="min-w-[10rem] flex-1">
          <Field label="Eie aktiwiteit" htmlFor="dagbeplanner-custom-name">
            <Input
              id="dagbeplanner-custom-name"
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder="bv. Middagete"
            />
          </Field>
        </div>
        <div className="w-24">
          <Field label="Duur (min)" htmlFor="dagbeplanner-custom-minutes">
            <Input
              id="dagbeplanner-custom-minutes"
              type="number"
              min={5}
              step={5}
              value={customMinutes}
              onChange={(event) => setCustomMinutes(Number(event.target.value))}
            />
          </Field>
        </div>
        <Button
          type="submit"
          variant="primary"
          className="bg-(--dagbeplanner-primary)"
        >
          Voeg by
        </Button>
      </form>
    </div>
  );
}
