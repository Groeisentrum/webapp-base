import Link from "next/link";
import {
  getPublicCategories,
  getPublicContent,
  getSiteConfig,
} from "@/shared/services/publicService";
import { SetupNotice } from "@/app/(public)/SetupNotice";
import { PublicShell } from "@/app/(public)/PublicShell";
import { ContentCard } from "@/app/(public)/ContentCard";
import { getVisitorEvents } from "@/features/events/eventService";
import { upcomingEvents } from "@/features/events/eventModel";
import { EventsPreview } from "@/features/events/EventsPreview";

/** Rendered per request so newly published content appears without a rebuild. */
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ taal?: string }>;
}) {
  const { taal } = await searchParams;

  let siteConfig;
  try {
    siteConfig = await getSiteConfig();
  } catch {
    // The deployment has not been seeded yet; point an operator at the admin area
    // rather than showing a broken page.
    return <SetupNotice />;
  }

  const language = taal ?? siteConfig.defaultLanguageCode;
  const [categories, content] = await Promise.all([
    getPublicCategories(language),
    getPublicContent({ language, page: 1, pageSize: 12 }),
  ]);
  const events = siteConfig.featureFlags.events
    ? await getVisitorEvents(language)
        .then((items) => upcomingEvents(items, new Date()))
        .catch(() => null)
    : undefined;

  return (
    <PublicShell siteConfig={siteConfig} language={language}>
      <section className="mb-8 sm:mb-10">
        <h1 className="text-2xl font-semibold text-balance text-(--text-primary) sm:text-3xl">
          {siteConfig.siteName}
        </h1>
      </section>

      {events && <EventsPreview events={events} language={language} />}
      {events === null && (
        <p className="mb-8 text-sm text-(--text-secondary)">
          Gebeure kon nie gelaai word nie.{" "}
          <Link
            href={`/gebeure?taal=${encodeURIComponent(language)}`}
            className="underline"
          >
            Probeer die gebeureblad.
          </Link>
        </p>
      )}

      {categories.length > 0 && (
        <section className="mb-8 sm:mb-10">
          <h2 className="mb-3 text-lg font-semibold text-(--text-primary)">
            Afdelings
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/kategorie/${category.slug}?taal=${encodeURIComponent(language)}`}
                  className="block rounded-lg border border-(--panel-border) bg-(--panel-bg) p-4 hover:border-(--brand-primary)"
                >
                  <span className="text-base font-medium text-(--text-primary)">
                    {category.name}
                  </span>
                  {category.children.length > 0 && (
                    <span className="mt-1 block text-sm text-(--text-secondary)">
                      {category.children.map((child) => child.name).join(" · ")}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-(--text-primary)">
          Onlangs
        </h2>
        {content.items.length === 0 ? (
          <p className="text-sm text-(--text-secondary)">
            Nog geen gepubliseerde inhoud nie.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {content.items.map((item) => (
              <li key={item.id}>
                <ContentCard content={item} language={language} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </PublicShell>
  );
}
