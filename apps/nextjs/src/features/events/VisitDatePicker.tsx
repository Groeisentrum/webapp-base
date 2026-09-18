"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./Events.module.css";

const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const label = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("af-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export function VisitDatePicker({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const [month, setMonth] = useState(() => {
    const date = from ? new Date(`${from}T12:00:00Z`) : new Date();
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12));
  });
  const [anchor, setAnchor] = useState("");
  const days = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
  ).getUTCDate();
  function move(amount: number) {
    setMonth(
      new Date(
        Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + amount, 1, 12),
      ),
    );
  }
  return (
    <div className={styles.datePicker}>
      <p className={styles.muted}>
        Kies ’n dag, of kies ’n tweede dag vir ’n reeks.
      </p>
      <div className={styles.calendarHeading}>
        <button
          type="button"
          aria-label="Vorige maand"
          onClick={() => move(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <strong aria-live="polite">
          {month.toLocaleDateString("af-ZA", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </strong>
        <button
          type="button"
          aria-label="Volgende maand"
          onClick={() => move(1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className={styles.calendarGrid}>
        {["Ma", "Di", "Wo", "Do", "Vr", "Sa", "So"].map((day) => (
          <span key={day}>{day}</span>
        ))}
        {Array.from({ length: (month.getUTCDay() + 6) % 7 }, (_, i) => (
          <span key={`empty-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = dayKey(
            new Date(
              Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), i + 1, 12),
            ),
          );
          return (
            <button
              key={day}
              type="button"
              aria-label={label(day)}
              aria-pressed={Boolean(from && day >= from && day <= (to || from))}
              onClick={() => {
                if (anchor && from === anchor && to === anchor) {
                  onChange(
                    day < anchor ? day : anchor,
                    day > anchor ? day : anchor,
                  );
                  setAnchor("");
                } else {
                  onChange(day, day);
                  setAnchor(day);
                }
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <p className={styles.muted} aria-live="polite">
        {from
          ? `${label(from)}${to && to !== from ? ` – ${label(to)}` : ""}`
          : "Enige datum"}
      </p>
    </div>
  );
}
