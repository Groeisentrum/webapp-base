"use client";

import Link from "next/link";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { EventImage, eventHref } from "./EventCard";
import { eventDate, type VisitorEvent } from "./eventModel";
import styles from "./Events.module.css";
import { localDay, readPreferences } from "./visitPreferences";

export function agendaMonths(events: VisitorEvent[]) {
  const groups = new Map<string, VisitorEvent[]>();
  for (const event of [...events].sort(
    (a, b) =>
      Date.parse(a.start ?? a.end ?? "") - Date.parse(b.start ?? b.end ?? ""),
  )) {
    const date = event.start ?? event.end;
    const key = date
      ? new Intl.DateTimeFormat("en-CA", {
          year: "numeric",
          month: "2-digit",
          timeZone: "Africa/Johannesburg",
        }).format(new Date(date))
      : "undated";
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.entries()];
}

export function EventAgenda({
  events,
  basePath,
  language,
  returnQuery,
  recurring = false,
}: {
  events: VisitorEvent[];
  basePath: string;
  language: string;
  returnQuery: string;
  recurring?: boolean;
}) {
  const groups = recurring
    ? [["recurring", events] as const]
    : agendaMonths(events);
  const preferences = readPreferences(
    Object.fromEntries(new URLSearchParams(returnQuery)),
  );
  return (
    <div>
      {groups.map(([month, items]) => (
        <section key={month} className={styles.agendaMonth}>
          {!recurring && (
            <h3 className={styles.monthHeading}>
              {items[0].start || items[0].end
                ? new Date(
                    (items[0].start ?? items[0].end)!,
                  ).toLocaleDateString("af-ZA", {
                    month: "long",
                    year: "numeric",
                    timeZone: "Africa/Johannesburg",
                  })
                : "Datum word bevestig"}
              <span>
                {items.length}{" "}
                {items.length === 1 ? "geleentheid" : "geleenthede"}
              </span>
            </h3>
          )}
          <ul className={styles.agendaList}>
            {items.map((event) => {
              const detail = eventHref(event, basePath, language, returnQuery);
              const canSelect =
                basePath.startsWith("/voorskou/") &&
                Boolean(event.tickets?.length);
              const booking = `${basePath}/${event.id}/bespreek?taal=${encodeURIComponent(language)}`;
              const date = event.start ? new Date(event.start) : null;
              const slots =
                event.demoSlots?.filter(
                  (slot) =>
                    !preferences.from ||
                    (localDay(slot.value) >= preferences.from &&
                      localDay(slot.value) <=
                        (preferences.to || preferences.from)),
                ) ?? [];
              return (
                <li
                  id={`event-${event.id}`}
                  key={event.id}
                  className={styles.agendaRow}
                >
                  <div className={styles.agendaDate}>
                    {recurring ? (
                      <>
                        <Clock size={24} aria-hidden="true" />
                        <span>Herhalend</span>
                      </>
                    ) : date ? (
                      <>
                        <strong>
                          {date.toLocaleDateString("af-ZA", {
                            day: "numeric",
                            timeZone: "Africa/Johannesburg",
                          })}
                        </strong>
                        <span>
                          {date.toLocaleDateString("af-ZA", {
                            weekday: "long",
                            timeZone: "Africa/Johannesburg",
                          })}
                        </span>
                      </>
                    ) : (
                      <span>Binnekort</span>
                    )}
                  </div>
                  <Link
                    href={detail}
                    className={styles.agendaImage}
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    <EventImage event={event} />
                  </Link>
                  <div className={styles.agendaInfo}>
                    <span className={styles.category}>{event.category}</span>
                    <h4>
                      <Link href={detail}>{event.title}</Link>
                    </h4>
                    <p className={styles.schedule}>
                      <Clock size={15} aria-hidden="true" />
                      {eventDate(event)}
                    </p>
                    {!recurring &&
                      event.facts.find((fact) => fact.label === "Tye") && (
                        <p className={styles.muted}>
                          {
                            event.facts.find((fact) => fact.label === "Tye")
                              ?.value
                          }
                        </p>
                      )}
                    {event.venue && (
                      <p className={styles.meta}>
                        <MapPin size={15} aria-hidden="true" />
                        {event.venue}
                      </p>
                    )}
                    <p className={styles.description}>{event.description}</p>
                    {canSelect && slots.length > 0 && (
                      <div className={styles.sessionOptions}>
                        <span className={styles.muted}>
                          Kies ’n sessie · beskikbaarheid moet bevestig word
                        </span>
                        <div>
                          {slots.map((slot) => (
                            <Link
                              key={slot.value}
                              href={`${booking}&sessie=${encodeURIComponent(slot.value)}`}
                              className={styles.sessionLink}
                            >
                              {slot.label}
                              <ArrowRight size={13} aria-hidden="true" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {canSelect &&
                      recurring &&
                      preferences.from &&
                      !slots.length && (
                        <p className={styles.muted}>
                          Sessies op jou gekose datums moet nog bevestig word.
                          Kies ’n tyd om ander sessies te verken.
                        </p>
                      )}
                  </div>
                  <div className={styles.agendaAction}>
                    <strong>{event.priceLabel}</strong>
                    <Link
                      href={canSelect ? booking : detail}
                      className={canSelect ? styles.primary : styles.secondary}
                    >
                      {canSelect
                        ? event.recurring
                          ? "Kies ’n tyd"
                          : "Kies kaartjies"
                        : "Besonderhede"}
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                    {canSelect && (
                      <Link href={detail} className={styles.textButton}>
                        Meer oor die ervaring
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
