"use client";
import Link from "next/link";
import { Button } from "@/shared/components/ui";
export default function EventsError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl text-(--brand-primary)">
        Ons kon nie die gebeure laai nie.
      </h1>
      <p className="my-5 text-(--text-secondary)">
        Probeer asseblief weer. Jou internetverbinding of die diens kan tydelik
        onbeskikbaar wees.
      </p>
      <Button className="min-h-11" onClick={reset}>
        Probeer weer
      </Button>
      <Link href="/" className="ml-5 underline">
        Terug na tuis
      </Link>
    </main>
  );
}
