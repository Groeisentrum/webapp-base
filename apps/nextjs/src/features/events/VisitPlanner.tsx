"use client";

import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Sparkles,
  Users,
} from "lucide-react";
import { Input, Field } from "@/shared/components/ui";
import { emptyPreferences, type VisitPreferences } from "./visitPreferences";
import { VisitDatePicker } from "./VisitDatePicker";
import styles from "./Events.module.css";

export function VisitPlanner({
  categories,
  initial,
  onApply,
}: {
  categories: string[];
  initial: VisitPreferences;
  onApply: (value: VisitPreferences) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");
  const changed = JSON.stringify(draft) !== JSON.stringify(initial);
  const completed =
    Number(Boolean(draft.from)) +
    Number(Boolean(draft.tags.length)) +
    Number(Boolean(draft.people));
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      draft.people &&
      (!Number.isSafeInteger(draft.people) || draft.people < 1)
    ) {
      setError("Vul ’n geldige aantal mense in.");
      return;
    }
    setError("");
    onApply({ ...draft, to: draft.to || draft.from });
    document.getElementById("events-heading")?.focus();
  }
  return (
    <details className={styles.plannerDisclosure}>
      <summary>
        <span>
          <strong>Kom ons vind iets vir jou.</strong>
          <small>Datums · Ervarings · Jou groep</small>
        </span>
        <ChevronDown size={22} aria-hidden="true" />
      </summary>
      <form
        className={styles.planner}
        onSubmit={submit}
        aria-labelledby="planner-heading"
      >
        <div className={styles.plannerHeading}>
          <div>
            <span className={styles.eyebrow}>Jou dag, jou keuse</span>
            <h2 id="planner-heading">Kom ons vind iets vir jou.</h2>
          </div>
          <span className={styles.muted}>
            {completed} van 3 voorkeure gekies
          </span>
        </div>
        <div className={styles.plannerSteps}>
          <fieldset>
            <legend>
              <span>1</span>
              <CalendarDays size={18} aria-hidden="true" />
              Wanneer wil jy kom?
            </legend>
            <VisitDatePicker
              from={draft.from}
              to={draft.to}
              onChange={(from, to) => setDraft({ ...draft, from, to })}
            />
            <button
              type="button"
              className={styles.textButton}
              onClick={() => {
                setDraft({ ...draft, from: "", to: "" });
              }}
            >
              Ek is buigsaam oor datums
            </button>
          </fieldset>
          <fieldset>
            <legend>
              <span>2</span>
              <Sparkles size={18} aria-hidden="true" />
              Wat wil jy beleef?
            </legend>
            <p className={`${styles.muted} mb-3`}>
              Kies een of meer. Los oop vir alles.
            </p>
            <div className={styles.plannerTags}>
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  className={styles.chip}
                  aria-pressed={draft.tags.includes(category)}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      tags: draft.tags.includes(category)
                        ? draft.tags.filter((tag) => tag !== category)
                        : [...draft.tags, category],
                    })
                  }
                >
                  {draft.tags.includes(category) && (
                    <Check size={14} aria-hidden="true" />
                  )}
                  {category}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>
              <span>3</span>
              <Users size={18} aria-hidden="true" />
              Wie kom saam?
            </legend>
            <Field
              label="Hoeveel mense?"
              htmlFor="visit-people"
              hint="Tel volwassenes en kinders saam."
            >
              <Input
                id="visit-people"
                type="number"
                min={1}
                step={1}
                placeholder="Bv. 4"
                value={draft.people || ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    people: e.target.value ? Number(e.target.value) : 0,
                  })
                }
              />
            </Field>
            <p className={`${styles.muted} mt-3`}>
              Ons gebruik bekende groepgroottes. Plekbeskikbaarheid moet steeds
              bevestig word.
            </p>
          </fieldset>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-(--state-danger)">
            {error}
          </p>
        )}
        <div className={styles.plannerFooter}>
          <div>
            <p className={styles.muted}>
              {changed
                ? "Jou nuwe keuses is nog nie toegepas nie."
                : "Alle voorkeure is opsioneel. Jy is in beheer."}
            </p>
            <button
              type="button"
              className={styles.textButton}
              onClick={() => {
                setDraft(emptyPreferences);

                setError("");
                onApply(emptyPreferences);
              }}
            >
              Wys alle gebeure
            </button>
          </div>
          <button type="submit" className={styles.primary}>
            Wys my opsies <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </form>
    </details>
  );
}
