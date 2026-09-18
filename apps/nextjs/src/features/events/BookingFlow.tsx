"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Minus,
  Plus,
} from "lucide-react";
import { Field, Input, Select } from "@/shared/components/ui";
import { eventDate, money, ticketTotal, type VisitorEvent } from "./eventModel";
import styles from "./Events.module.css";
import { visitCalendar } from "./visitCalendar";

/** Local demonstration only: no requests, storage, payment details or inventory holds. */
export function BookingFlow({
  event,
  basePath,
  language,
  initialSession,
}: {
  event: VisitorEvent;
  basePath: string;
  language: string;
  initialSession?: string;
}) {
  const tickets = event.tickets ?? [];
  const [step, setStep] = useState(1);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [slot, setSlot] = useState(
    event.demoSlots?.some((slot) => slot.value === initialSession)
      ? initialSession!
      : "",
  );
  const [plan, setPlan] = useState<{
    reference: string;
    issuedAt: string;
  } | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const count = tickets.reduce(
    (sum, ticket) => sum + (quantities[ticket.id] ?? 0),
    0,
  );
  const total = ticketTotal(tickets, quantities);
  const selectedSlot = event.demoSlots?.find((value) => value.value === slot);
  const eventSlotsRequired = Boolean(event.demoSlots?.length);
  const detailHref = `${basePath}/${event.id}?taal=${encodeURIComponent(language)}`;
  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  function changeStep(next: number) {
    setError("");
    setStep(next);
  }
  function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (step === 1 && !count) {
      setError("Kies minstens een kaartjie of groepsessie om voort te gaan.");
      return;
    }
    if (step === 1 && eventSlotsRequired && !selectedSlot) {
      setError("Kies asseblief ’n sessie.");
      return;
    }
    if (step === 2 && !name.trim()) {
      setError("Vul asseblief ’n kontaknaam in.");
      return;
    }
    if (step === 3 && !acknowledged) {
      setError(
        "Bevestig asseblief dat jou keuse nog nie ’n bespreking is nie.",
      );
      return;
    }
    if (step === 3)
      setPlan({
        reference: `PLAN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        issuedAt: new Date().toISOString(),
      });
    changeStep(step + 1);
  }

  if (!tickets.length)
    return <p>Aanlynbespreking is nie vir hierdie ervaring beskikbaar nie.</p>;
  if (step === 4)
    return (
      <div className={styles.success}>
        <CheckCircle2 size={52} strokeWidth={1.5} aria-hidden="true" />
        <span className={styles.eyebrow}>Jou besoekopsomming</span>
        <h1 ref={heading} tabIndex={-1}>
          Jou uitstappie neem vorm aan.
        </h1>
        <p>
          {name}, hier is jou keuse vir <strong>{event.title}</strong>.
        </p>
        <div className={styles.notice}>
          Geen kaartjies is uitgereik, geen betaling is geneem en geen e-pos is
          gestuur nie. Aanlynbesprekings is nog nie beskikbaar nie.
        </div>
        <dl className="my-6 text-left">
          {tickets
            .filter((ticket) => quantities[ticket.id])
            .map((ticket) => (
              <div className={styles.summaryRow} key={ticket.id}>
                <dt>
                  {quantities[ticket.id]} × {ticket.label}
                </dt>
                <dd>{money(ticket.cents * quantities[ticket.id])}</dd>
              </div>
            ))}
          <div className={styles.summaryRow}>
            <dt>Planverwysing</dt>
            <dd>{plan?.reference}</dd>
          </div>
          <div className={styles.summaryRow}>
            <dt>Waar</dt>
            <dd>{event.venue}</dd>
          </div>
          <div className={styles.summaryRow}>
            <dt>{selectedSlot ? "Sessie" : "Geleentheid"}</dt>
            <dd>{selectedSlot?.label ?? eventDate(event)}</dd>
          </div>
          <div className={styles.total}>
            <dt>Kaartjietotaal</dt>
            <dd>{money(total)}</dd>
          </div>
        </dl>
        <div className="mb-6 text-left">
          <h2 className="mb-3 text-lg font-semibold text-(--brand-primary)">
            Voor jou besoek
          </h2>
          <p className={styles.muted}>
            Bevestig jou sessie en toegangsreëlings by die organiseerder. Jou
            kalenderinskrywing is ’n besoekplan, nie ’n kaartjie nie.
          </p>
          {event.facts.map((fact) => (
            <p key={fact.label} className={styles.muted}>
              <strong>{fact.label}:</strong> {fact.value}
            </p>
          ))}
        </div>
        {plan &&
          (() => {
            const calendar = visitCalendar(
              event,
              selectedSlot?.value ?? null,
              plan.reference,
              new Date(plan.issuedAt),
            );
            return calendar ? (
              <a
                className={`${styles.secondary} mb-4`}
                href={`data:text/calendar;charset=utf-8,${encodeURIComponent(calendar)}`}
                download={`${plan.reference}.ics`}
              >
                Voeg by my kalender
              </a>
            ) : null;
          })()}
        <p className={styles.muted}>
          Bewaar jou plan in jou kalender om later daarna terug te verwys. Dit
          word nie in ’n rekening gestoor nie.
        </p>
        <Link href={basePath} className={styles.primary}>
          Ontdek nog ervarings <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
    );

  return (
    <div className={styles.experience}>
      <Link href={detailHref} className={styles.textButton}>
        <ArrowLeft size={16} aria-hidden="true" />
        Terug na die ervaring
      </Link>
      <h1 className={styles.detailTitle}>Beplan jou besoek.</h1>
      <ol className={styles.steps} aria-label="Besprekingstappe">
        {["Tyd & kaartjies", "Jou besonderhede", "Hersien"].map(
          (label, index) => (
            <li
              key={label}
              className={styles.step}
              aria-current={step === index + 1 ? "step" : undefined}
            >
              <span className={styles.stepNumber}>
                {step > index + 1 ? (
                  <Check size={15} aria-label="Voltooi" />
                ) : (
                  index + 1
                )}
              </span>
              {label}
            </li>
          ),
        )}
      </ol>
      <div className={styles.detailGrid}>
        <form className={styles.formPanel} onSubmit={submit}>
          <h2 ref={heading} tabIndex={-1}>
            {step === 1
              ? "Wie kom saam?"
              : step === 2
                ? "Wie is die kontakpersoon?"
                : "Lyk alles reg?"}
          </h2>
          {error && (
            <p
              role="alert"
              className="mb-4 rounded bg-(--state-danger-bg) p-3 text-sm text-(--state-danger)"
            >
              {error}
            </p>
          )}
          {step === 1 && (
            <>
              <p className={styles.muted}>
                Kies ’n tyd en kaartjies wat by jou uitstappie pas.
              </p>
              {event.demoSlots?.length ? (
                <div className="my-5">
                  <Field
                    htmlFor="session"
                    label="Kies ’n sessie"
                    hint="Beskikbaarheid moet nog bevestig word."
                  >
                    <Select
                      id="session"
                      value={slot}
                      onChange={(e) => setSlot(e.target.value)}
                      required
                    >
                      <option value="">Kies ’n tyd</option>
                      {event.demoSlots.map((value) => (
                        <option key={value.value} value={value.value}>
                          {value.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              ) : (
                <p className="mt-4 text-sm font-medium">{eventDate(event)}</p>
              )}
              {tickets.map((ticket) => (
                <div className={styles.ticket} key={ticket.id}>
                  <div>
                    <strong>{ticket.label}</strong>
                    <p className={styles.muted}>{ticket.note}</p>
                    <p className="mt-1 text-sm font-semibold text-(--brand-primary)">
                      {money(ticket.cents)}
                    </p>
                  </div>
                  <div className={styles.counter}>
                    <button
                      type="button"
                      aria-label={`Minder: ${ticket.label}`}
                      disabled={!quantities[ticket.id]}
                      onClick={() =>
                        setQuantities((previous) => ({
                          ...previous,
                          [ticket.id]: (previous[ticket.id] ?? 0) - 1,
                        }))
                      }
                    >
                      <Minus size={16} aria-hidden="true" />
                    </button>
                    <output
                      aria-label={`Aantal: ${ticket.label}`}
                      aria-live="polite"
                    >
                      {quantities[ticket.id] ?? 0}
                    </output>
                    <button
                      type="button"
                      aria-label={`Meer: ${ticket.label}`}
                      disabled={
                        count >= 10 ||
                        Boolean(
                          ticket.maxQuantity &&
                          (quantities[ticket.id] ?? 0) >= ticket.maxQuantity,
                        )
                      }
                      onClick={() =>
                        setQuantities((previous) => ({
                          ...previous,
                          [ticket.id]: (previous[ticket.id] ?? 0) + 1,
                        }))
                      }
                    >
                      <Plus size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
              <p className="mt-3 text-xs text-(--text-secondary)">
                Vir groter groepe, kontak ons om julle besoek te reël.
              </p>
            </>
          )}
          {step === 2 && (
            <div className={styles.formFields}>
              <p className={styles.muted}>
                Jou besonderhede bly slegs op hierdie blad en word nie gestuur
                of gestoor nie.
              </p>
              <Field label="Kontaknaam" htmlFor="booking-name">
                <Input
                  id="booking-name"
                  value={name}
                  autoComplete="off"
                  maxLength={100}
                  required
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label="E-posadres" htmlFor="booking-email">
                <Input
                  id="booking-email"
                  type="email"
                  value={email}
                  autoComplete="off"
                  maxLength={254}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <p className={styles.muted}>Geen rekening nodig nie.</p>
            </div>
          )}
          {step === 3 && (
            <>
              <div className="mb-6">
                <p className="font-semibold text-(--brand-primary)">
                  {event.title}
                </p>
                <p className={styles.muted}>
                  {selectedSlot?.label ?? eventDate(event)}
                </p>
                {tickets
                  .filter((ticket) => quantities[ticket.id])
                  .map((ticket) => (
                    <div className={styles.summaryRow} key={ticket.id}>
                      <span>
                        {quantities[ticket.id]} × {ticket.label}
                      </span>
                      <span className="whitespace-nowrap">
                        {money(ticket.cents * quantities[ticket.id])}
                      </span>
                    </div>
                  ))}
                <div className={styles.total}>
                  <span>Kaartjietotaal</span>
                  <span>{money(total)}</span>
                </div>
                {event.facts
                  .filter((fact) => fact.label === "Parkering")
                  .map((fact) => (
                    <p className={styles.muted} key={fact.label}>
                      {fact.value}
                    </p>
                  ))}
              </div>
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{name}</p>
                  <p className={`${styles.muted} break-all`}>{email}</p>
                </div>
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => changeStep(2)}
                >
                  Wysig
                </button>
              </div>
              <p className={styles.notice}>
                Aanlynbesprekings is nog nie beskikbaar nie. Jy kan jou
                besoekopsomming hieronder bekyk; geen plekke word bespreek of
                betaling geneem nie.
              </p>
              <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
                <input
                  className="mt-1 size-5 shrink-0 accent-(--brand-primary)"
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  required
                />
                Ek verstaan dat my keuse nog nie ’n bevestigde bespreking is
                nie.
              </label>
            </>
          )}
          <div className={styles.actions}>
            {step > 1 ? (
              <button
                type="button"
                className={styles.secondary}
                onClick={() => changeStep(step - 1)}
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Terug
              </button>
            ) : (
              <Link href={detailHref} className={styles.secondary}>
                Kanselleer
              </Link>
            )}
            <button type="submit" className={styles.primary}>
              {step === 3 ? "Bekyk besoekopsomming" : "Gaan voort"}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </form>
        <aside className={styles.bookingPanel} aria-label="Jou keuse">
          <span className={styles.eyebrow}>Jou uitstappie</span>
          <h2>{event.title}</h2>
          <p className={styles.muted}>
            {selectedSlot?.label ?? eventDate(event)}
          </p>
          <p className={styles.muted}>{event.venue}</p>
          {count ? (
            <div>
              {tickets
                .filter((ticket) => quantities[ticket.id])
                .map((ticket) => (
                  <div className={styles.summaryRow} key={ticket.id}>
                    <span>
                      {quantities[ticket.id]} × {ticket.label}
                    </span>
                    <span className="whitespace-nowrap">
                      {money(ticket.cents * quantities[ticket.id])}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p className={styles.muted}>Jou kaartjies sal hier verskyn.</p>
          )}
          <div className={styles.total} aria-live="polite">
            <span>Kaartjietotaal</span>
            <span>{money(total)}</span>
          </div>
          {event.facts
            .filter((fact) => fact.label === "Parkering")
            .map((fact) => (
              <p className={styles.notice} key={fact.label}>
                {fact.value}
              </p>
            ))}
          <p className={styles.muted}>
            Volgens gepubliseerde tariewe. Finale prys en beskikbaarheid moet
            bevestig word.
          </p>
          {step > 1 && (
            <button
              type="button"
              className={styles.textButton}
              onClick={() => changeStep(1)}
            >
              Wysig kaartjies en tyd
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
