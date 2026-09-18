import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EventCard } from "./EventCard";
import type { VisitorEvent } from "./eventModel";
import styles from "./Events.module.css";

export function EventsPreview({
  events,
  language,
  basePath = "/gebeure",
}: {
  events: VisitorEvent[];
  language: string;
  basePath?: string;
}) {
  return (
    <section className="mb-10" aria-labelledby="upcoming-preview">
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.eyebrow}>Maak ’n dag daarvan</span>
          <h2 id="upcoming-preview" className="mt-2">
            Iets om na uit te sien
          </h2>
        </div>
        <Link
          className={styles.textButton}
          href={`${basePath}?taal=${encodeURIComponent(language)}`}
        >
          Alle gebeure en ervarings <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      {events.length ? (
        <ul className={styles.grid}>
          {events.slice(0, 3).map((event) => (
            <li key={event.id}>
              <EventCard
                event={event}
                basePath={basePath}
                language={language}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.muted}>
          Nuwe geleenthede word binnekort aangekondig.
        </p>
      )}
    </section>
  );
}
