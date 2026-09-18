"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Modal } from "@/shared/components/Modal";
import { Field, Input } from "@/shared/components/ui";
import styles from "./Events.module.css";

export function EnquiryButton({
  subject = "Groepbesoek",
  secondary = false,
}: {
  subject?: string;
  secondary?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    setReview(false);
    trigger.current?.focus();
  }, []);
  useEffect(() => {
    if (!open) return;
    const dialog = form.current?.closest('[role="dialog"]');
    (dialog?.querySelector("input") as HTMLElement)?.focus();
    function trap(event: KeyboardEvent) {
      if (event.key !== "Tab" || !dialog) return;
      const controls = [
        ...dialog.querySelectorAll<HTMLElement>(
          'button, input, textarea, select, [tabindex="0"]',
        ),
      ].filter((el) => !el.hasAttribute("disabled"));
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [open]);
  return (
    <>
      <button
        ref={trigger}
        className={secondary ? styles.secondary : styles.primary}
        onClick={() => setOpen(true)}
      >
        Doen navraag <ArrowRight size={16} aria-hidden="true" />
      </button>
      <Modal isOpen={open} title="Kom ons help jou beplan" onClose={close}>
        <p className={`${styles.muted} mb-5`}>{subject}</p>
        <form
          ref={form}
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setReview(true);
          }}
          onChange={() => setReview(false)}
        >
          <Field label="Jou naam" htmlFor="enquiry-name">
            <Input
              id="enquiry-name"
              name="name"
              autoComplete="name"
              required
              maxLength={120}
            />
          </Field>
          <Field label="E-posadres" htmlFor="enquiry-email">
            <Input
              id="enquiry-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </Field>
          <Field label="Waarmee kan ons help?" htmlFor="enquiry-message">
            <textarea
              id="enquiry-message"
              name="message"
              required
              maxLength={3000}
              rows={4}
              className="w-full rounded border border-(--panel-border) bg-(--input-bg) p-3"
              placeholder="Vertel ons van jou datums, groep en enige vrae."
            />
          </Field>
          <p className={styles.muted}>
            Aanlyn versending is nog nie beskikbaar nie. Jou besonderhede bly
            net in hierdie oop vorm en word nie gestuur of gestoor nie.
          </p>
          {review && (
            <p role="status" className={styles.notice}>
              Jou navraag is ingevul, maar nog nie gestuur nie. Versending moet
              eers geaktiveer word.
            </p>
          )}
          <button className={styles.primary} type="submit">
            Hersien navraag <ArrowRight size={16} aria-hidden="true" />
          </button>
        </form>
      </Modal>
    </>
  );
}
