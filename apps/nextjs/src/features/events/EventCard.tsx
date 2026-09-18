"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Landmark, MapPin } from "lucide-react";
import { eventDate, type VisitorEvent } from "./eventModel";
import styles from "./Events.module.css";

export function EventImage({
  event,
  eager = false,
}: {
  event: VisitorEvent;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!event.image || failed)
    return (
      <div className={styles.fallback}>
        <Landmark size={46} strokeWidth={1} aria-hidden="true" />
        <span className="sr-only">{event.title}</span>
      </div>
    );
  // Tenant-owned image hosts vary, as in the existing AssetEmbed component.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={event.image}
      alt={event.title}
      className={styles.photo}
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed(true)}
    />
  );
}

export function eventHref(
  event: VisitorEvent,
  basePath: string,
  language: string,
  returnQuery = "",
) {
  const params = new URLSearchParams({ taal: language });
  if (returnQuery) params.set("terug", returnQuery);
  return `${basePath}/${encodeURIComponent(event.id)}?${params}`;
}

export function EventCard({
  event,
  basePath,
  language,
  returnQuery,
}: {
  event: VisitorEvent;
  basePath: string;
  language: string;
  returnQuery?: string;
}) {
  const date = event.start ? new Date(event.start) : null;
  return (
    <Link
      id={`event-${event.id}`}
      className={styles.card}
      href={eventHref(event, basePath, language, returnQuery)}
    >
      <div className={styles.cardMedia}>
        <EventImage event={event} />
        {date && !event.recurring && (
          <span className={styles.dateBadge} aria-hidden="true">
            <strong>
              {date.toLocaleDateString("af-ZA", {
                day: "numeric",
                timeZone: "Africa/Johannesburg",
              })}
            </strong>
            {date
              .toLocaleDateString("af-ZA", {
                month: "short",
                timeZone: "Africa/Johannesburg",
              })
              .toUpperCase()}
          </span>
        )}
      </div>
      <div className={styles.cardBody}>
        <span className={styles.category}>{event.category}</span>
        <h3>{event.title}</h3>
        <p className={styles.description}>{event.description}</p>
        <p className={styles.meta}>
          <CalendarDays size={15} aria-hidden="true" />
          {eventDate(event)}
        </p>
        {event.venue && (
          <p className={styles.meta}>
            <MapPin size={15} aria-hidden="true" />
            {event.venue}
          </p>
        )}
        <div className={styles.cardFooter}>
          <span>{event.priceLabel}</span>
          <span className="inline-flex items-center gap-1">
            Ontdek <ArrowUpRight size={17} aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
