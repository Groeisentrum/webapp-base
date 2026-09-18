import Link from "next/link";
export default function EventNotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl text-(--brand-primary)">
        Hierdie geleentheid is nie beskikbaar nie.
      </h1>
      <p className="my-5 text-(--text-secondary)">
        Die skakel het moontlik verander. Ontdek ander gebeure en ervarings.
      </p>
      <Link
        href="/gebeure"
        className="inline-flex min-h-11 items-center underline"
      >
        Verken gebeure
      </Link>
    </main>
  );
}
