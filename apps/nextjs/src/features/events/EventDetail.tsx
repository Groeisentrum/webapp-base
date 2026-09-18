"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  MapPin,
  Share2,
} from "lucide-react";
import { EventImage } from "./EventCard";
import { eventDate, type VisitorEvent } from "./eventModel";
import { EnquiryButton } from "./EnquiryButton";
import styles from "./Events.module.css";

export function EventDetail({
  event,
  language,
  basePath = "/gebeure",
  preview = false,
  contactEmail,
  returnQuery = "",
  past = false,
}: {
  event: VisitorEvent;
  language: string;
  basePath?: string;
  preview?: boolean;
  contactEmail?: string | null;
  returnQuery?: string;
  past?: boolean;
}) {
  const [shareStatus, setShareStatus] = useState("");
  const backParams = new URLSearchParams(returnQuery);
  const safeBack = new URLSearchParams({ taal: language });
  for (const key of ["soek", "tipe", "van", "tot", "mense", "belang"])
    if (backParams.get(key)) safeBack.set(key, backParams.get(key)!);
  async function share() {
    try {
      if (navigator.share)
        await navigator.share({
          title: event.title,
          url: window.location.href,
        });
      else {
        await navigator.clipboard.writeText(window.location.href);
        setShareStatus("Skakel gekopieer.");
      }
    } catch {
      setShareStatus(
        "Deel gekanselleer of onbeskikbaar. Kopieer gerus die adres uit jou blaaier.",
      );
    }
  }
  return (
    <article className={`${styles.experience} ${styles.detailSurface}`}>
      <nav className={styles.breadcrumbs} aria-label="Broodkrummels">
        <Link
          href={`${basePath}?${safeBack}#event-${event.id}`}
          className={styles.textButton}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Alle gebeure en ervarings
        </Link>
      </nav>
      <div className={styles.detailImage}>
        <EventImage event={event} eager />
      </div>
      <header className="mb-6 max-w-3xl">
        <span className={styles.eyebrow}>{event.category}</span>
        <h1 className={styles.detailTitle}>{event.title}</h1>
        <p className="text-lg leading-relaxed text-(--text-secondary)">
          {event.description}
        </p>
      </header>
      <div className={`${styles.detailGrid} ${styles.eventDetails}`}>
        <div>
          <div className={styles.body}>{event.body}</div>
          {event.facts.length > 0 && (
            <>
              <h2 className="text-xl text-(--brand-primary)">
                Goed om te weet
              </h2>
              <dl className={styles.facts}>
                {event.facts.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          <div className="flex flex-wrap items-center gap-5">
            <button className={styles.textButton} onClick={share}>
              <Share2 size={16} aria-hidden="true" />
              Deel hierdie ervaring
            </button>
          </div>
          <p role="status" className={styles.muted}>
            {shareStatus}
          </p>
        </div>
        <aside
          className={styles.bookingPanel}
          aria-label="Besoek en bespreking"
        >
          <span className={styles.eyebrow}>
            {past ? "Vorige geleentheid" : "Jou volgende uitstappie"}
          </span>
          <h2>{event.priceLabel}</h2>
          <p className={styles.meta}>
            <CalendarDays size={18} aria-hidden="true" />
            {eventDate(event)}
          </p>
          {event.venue && (
            <p className={styles.meta}>
              <MapPin size={18} aria-hidden="true" />
              {event.venue}
            </p>
          )}
          {past ? (
            <p className={styles.notice}>
              Hierdie geleentheid het reeds plaasgevind. Die besonderhede bly
              beskikbaar vir naslaan.
            </p>
          ) : preview && event.tickets?.length ? (
            <>
              <Link
                className={styles.primary}
                href={`${basePath}/${event.id}/bespreek?taal=${encodeURIComponent(language)}`}
              >
                {event.recurring ? "Kies ’n sessie" : "Kies jou kaartjies"}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <p className={styles.muted}>
                Kies jou kaartjies en hersien jou besoekbesonderhede.
              </p>
            </>
          ) : (
            <>
              <p className={styles.muted}>
                Aanlynbespreking is nie vir hierdie ervaring beskikbaar nie.
                Bevestig die reëlings voor jou besoek.
              </p>
              {contactEmail && <EnquiryButton subject={event.title} />}
            </>
          )}
        </aside>
      </div>
    </article>
  );
}
