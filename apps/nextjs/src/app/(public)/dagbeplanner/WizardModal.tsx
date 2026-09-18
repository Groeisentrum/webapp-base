"use client";

import { useState } from "react";
import { Button, Field, Input } from "@/shared/components/ui";
import { Modal } from "@/shared/components/Modal";
import { CATALOGUE } from "@/shared/lib/dagbeplanner/catalogue";
import type { CatalogueAttractionId } from "@/shared/lib/dagbeplanner/types";
import { useDagbeplannerStore } from "@/shared/stores/useDagbeplannerStore";

/**
 * "Recommend a schedule": start time, time budget, and a must-see selection, routed
 * with the engine's nearest-neighbour walk. Applying this over an existing plan is a
 * destructive replace — `applyWizardPlan` in the store detects that and routes through
 * the confirm-overwrite flow instead of applying directly.
 */
export function WizardModal() {
  const isWizardOpen = useDagbeplannerStore((state) => state.isWizardOpen);
  const wizardDraft = useDagbeplannerStore((state) => state.wizardDraft);
  const closeWizard = useDagbeplannerStore((state) => state.closeWizard);
  const applyWizardPlan = useDagbeplannerStore(
    (state) => state.applyWizardPlan,
  );

  const [startTime, setStartTime] = useState(wizardDraft.startTime);
  const [timeBudgetMinutes, setTimeBudgetMinutes] = useState(
    wizardDraft.timeBudgetMinutes,
  );
  const [selectedIds, setSelectedIds] = useState<CatalogueAttractionId[]>(
    wizardDraft.selectedIds,
  );

  // `wizardDraft` gets a fresh object identity every time openWizard() runs. Resetting
  // form state during render (rather than in an effect) avoids the extra render pass
  // an effect-based sync would cause — see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const [priorWizardDraft, setPriorWizardDraft] = useState(wizardDraft);
  if (wizardDraft !== priorWizardDraft) {
    setPriorWizardDraft(wizardDraft);
    setStartTime(wizardDraft.startTime);
    setTimeBudgetMinutes(wizardDraft.timeBudgetMinutes);
    setSelectedIds(wizardDraft.selectedIds);
  }

  if (!isWizardOpen) return null;

  const toggleId = (id: CatalogueAttractionId) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  return (
    <Modal
      isOpen
      title="Beveel 'n skedule aan"
      onClose={closeWizard}
      footer={
        <>
          <Button variant="secondary" onClick={closeWizard}>
            Kanselleer
          </Button>
          <Button
            variant="primary"
            className="bg-(--dagbeplanner-primary)"
            disabled={selectedIds.length === 0}
            onClick={() =>
              applyWizardPlan(startTime, timeBudgetMinutes, selectedIds)
            }
          >
            Genereer skedule
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Begintyd" htmlFor="wizard-start-time">
            <Input
              id="wizard-start-time"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </Field>
          <Field label="Tydbegroting (min)" htmlFor="wizard-budget">
            <Input
              id="wizard-budget"
              type="number"
              min={30}
              step={15}
              value={timeBudgetMinutes}
              onChange={(event) =>
                setTimeBudgetMinutes(Number(event.target.value))
              }
            />
          </Field>
        </div>

        <div>
          <p className="text-sm font-medium text-(--text-primary)">
            Kies jou moet-sien plekke
          </p>
          <p className="mb-2 text-xs text-(--text-secondary)">
            Ons voeg outomaties nog plekke by om jou orige tydbegroting te vul.
          </p>
          <div className="flex flex-col gap-2">
            {CATALOGUE.map((attraction) => (
              <label
                key={attraction.id}
                className="flex items-center gap-2 rounded-md border border-(--panel-border) px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(attraction.id)}
                  onChange={() => toggleId(attraction.id)}
                />
                <span className="flex-1 text-(--text-primary)">
                  {attraction.name}
                </span>
                <span className="text-xs text-(--text-secondary)">
                  {attraction.dwellMinutes} min
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
