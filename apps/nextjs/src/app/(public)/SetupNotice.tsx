import Link from "next/link";

/** Shown before a deployment has been seeded, so the first page load is actionable. */
export function SetupNotice() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4">
      <div className="rounded-lg border border-(--panel-border) bg-(--panel-bg) p-6">
        <h1 className="text-lg font-semibold text-(--text-primary)">Werf nog nie opgestel nie</h1>
        <p className="mt-2 text-sm text-(--text-secondary)">
          Hierdie ontplooiing het nog geen werfinstellings nie. Teken in as administrateur
          en stel die werfnaam, tale en kategorieë op.
        </p>
        <Link
          href="/admin/instellings"
          className="mt-4 inline-block rounded-md bg-(--brand-primary) px-4 py-2 text-sm text-(--text-inverse)"
        >
          Gaan na werfinstellings
        </Link>
      </div>
    </main>
  );
}
