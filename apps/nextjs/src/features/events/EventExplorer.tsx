"use client";

import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { VisitPlanner } from "./VisitPlanner";
import {
  emptyPreferences,
  matchesVisit,
  preferencesQuery,
  type VisitPreferences,
} from "./visitPreferences";
import { EventAgenda } from "./EventAgenda";
import type { VisitorEvent } from "./eventModel";
import { EnquiryButton } from "./EnquiryButton";
import styles from "./Events.module.css";

export function EventExplorer({
  events,
  language,
  basePath = "/gebeure",
  initialSearch = "",
  initialCategory = "",
  contactEmail,
  initialPreferences,
}: {
  events: VisitorEvent[];
  language: string;
  basePath?: string;
  initialSearch?: string;
  initialCategory?: string;
  contactEmail?: string | null;
  initialPreferences?: VisitPreferences;
}) {
  const [applied, setApplied] = useState<VisitPreferences>(
    initialPreferences ?? {
      ...emptyPreferences,
      search: initialSearch,
      tags: initialCategory ? [initialCategory] : [],
    },
  );
  const categories = [...new Set(events.map((event) => event.category))];
  const isFiltered = Boolean(
    applied.from || applied.tags.length || applied.people || applied.search,
  );
  const visible = events.filter((event) => matchesVisit(event, applied));
  const dated = visible.filter((event) => !event.recurring);
  const recurring = visible.filter((event) => event.recurring);
  const returnQuery = preferencesQuery(applied).toString();
  function apply(value: VisitPreferences) {
    setApplied(value);
    const url = new URL(window.location.href);
    for (const key of ["van", "tot", "belang", "mense", "soek", "tipe"])
      url.searchParams.delete(key);
    preferencesQuery(value).forEach((value, key) =>
      url.searchParams.set(key, value),
    );
    window.history.replaceState(null, "", url);
  }

  return (
    <div className={styles.experience}>
      <header className={styles.intro}>
        <span className={styles.eyebrow}>Gebeurekalender & besprekings</span>
        <h1>Beplan jou besoek.</h1>
        <p>
          Wat gebeur wanneer? Verken die volledige program, kies jou ervaring en
          beplan wie saamkom.
        </p>
        <nav className={styles.agendaNav} aria-label="Spring na die program">
          <a href="#alle-gebeure">
            Komende gebeure <ArrowRight size={16} aria-hidden="true" />
          </a>
          <a href="#ervarings">
            Herhalende ervarings <ArrowRight size={16} aria-hidden="true" />
          </a>
        </nav>
      </header>
      <VisitPlanner
        key={returnQuery}
        categories={categories}
        initial={applied}
        onApply={apply}
      />
      <section
        id="alle-gebeure"
        className="scroll-mt-6"
        aria-labelledby="events-heading"
      >
        <div className={styles.sectionHeading}>
          <h2 id="events-heading" tabIndex={-1}>
            {isFiltered ? "Gebeure vir jou besoek" : "Alle komende gebeure"}
          </h2>
          <span className={styles.muted}>Alle datums, in volgorde</span>
        </div>
        <div className={styles.results}>
          <span role="status">
            {dated.length} gebeure · {recurring.length} ervarings
            {isFiltered ? " pas by jou voorkeure" : " · alle datums"}
          </span>
          {isFiltered && (
            <button
              onClick={() => apply(emptyPreferences)}
              className={styles.textButton}
            >
              <X size={14} aria-hidden="true" />
              Vee filters uit
            </button>
          )}
        </div>
        {isFiltered && (
          <p className={`${styles.muted} mb-4`}>
            {[
              applied.from
                ? `${applied.from}${applied.to && applied.to !== applied.from ? " – " + applied.to : ""}`
                : "Enige datum",
              applied.tags.length ? applied.tags.join(" · ") : "Alle ervarings",
              applied.people ? `${applied.people} mense` : "Enige groepgrootte",
              applied.search,
            ]
              .filter(Boolean)
              .join(" / ")}
            . Herhalende tye en onbekende groepgroottes moet bevestig word.
          </p>
        )}
        {dated.length ? (
          <EventAgenda
            events={dated}
            basePath={basePath}
            language={language}
            returnQuery={returnQuery}
          />
        ) : (
          <div className={styles.empty}>
            <p>
              {isFiltered
                ? "Geen komende gebeure pas by hierdie soektog nie."
                : "Nuwe datums word binnekort aangekondig."}
            </p>
            <p className={styles.muted}>Verken ook die ervarings hieronder.</p>
          </div>
        )}
      </section>

      <section
        id="ervarings"
        className={styles.recurring}
        aria-labelledby="experiences-heading"
      >
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Meer om te beleef</span>
            <h2 id="experiences-heading" className="mt-2">
              Ervarings deur die jaar
            </h2>
          </div>
          <p className={styles.muted}>
            Kies eers jou ervaring. Vind dan ’n tyd.
          </p>
        </div>
        {recurring.length ? (
          <EventAgenda
            events={recurring}
            basePath={basePath}
            language={language}
            returnQuery={returnQuery}
            recurring
          />
        ) : (
          <div className={styles.empty}>
            <p>
              {isFiltered
                ? "Geen ervarings pas by hierdie soektog nie."
                : "Herhalende ervarings sal hier verskyn sodra dit gepubliseer is."}
            </p>
            {isFiltered && (
              <button
                className={styles.textButton}
                onClick={() => apply(emptyPreferences)}
              >
                Wys alles
              </button>
            )}
          </div>
        )}
      </section>
      {contactEmail && (
        <aside className={styles.visit}>
          <div>
            <h2>Beplan jy iets saam met ’n groep?</h2>
            <p className={styles.muted}>
              Kry hulp om die regte ervaring vir julle besoek te vind.
            </p>
          </div>
          <EnquiryButton secondary />
        </aside>
      )}
    </div>
  );
}
