import Link from "next/link";
import { ChevronRight, Compass, Newspaper } from "lucide-react";
import { getPublicCategories, getPublicContent, getSiteConfig } from "@/shared/services/publicService";
import { SetupNotice } from "@/app/(public)/SetupNotice";
import { PublicShell } from "@/app/(public)/PublicShell";
import { ContentCard } from "@/app/(public)/ContentCard";
import { SectionBand } from "@/app/(public)/SectionBand";
import { SiteHero } from "@/app/(public)/SiteHero";

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

  return (
    <PublicShell
      siteConfig={siteConfig}
      language={language}
      hero={<SiteHero siteName={siteConfig.siteName} />}
    >
      {categories.length > 0 && (
        <section className="mb-10 sm:mb-12">
          <SectionBand title="Afdelings" icon={Compass} className="mb-6" />

          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/kategorie/${category.slug}?taal=${encodeURIComponent(language)}`}
                  className="group flex h-full items-center gap-3 rounded-lg border border-(--panel-border) bg-(--panel-bg) p-4 transition hover:border-(--brand-primary) hover:shadow-md motion-reduce:transition-none"
                >
                  {/* The client's own colour for this section, straight from their
                      category data — the one place each section is visually itself. */}
                  <span
                    aria-hidden="true"
                    className="h-10 w-1.5 shrink-0 rounded-full bg-(--brand-primary)"
                    style={category.colour ? { backgroundColor: category.colour } : undefined}
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-(--text-primary) group-hover:text-(--brand-primary)">
                      {category.name}
                    </span>

                    {category.children.length > 0 && (
                      <span className="block text-sm text-(--text-secondary)">
                        {category.children.length} onderafdelings
                      </span>
                    )}
                  </span>

                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-(--text-secondary) transition group-hover:translate-x-0.5 group-hover:text-(--brand-primary) motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionBand title="Onlangs" icon={Newspaper} className="mb-6" />

        {content.items.length === 0 ? (
          <p className="rounded-lg border border-(--panel-border) bg-(--panel-bg) p-6 text-center text-sm text-(--text-secondary)">
            Nog geen gepubliseerde inhoud nie.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
