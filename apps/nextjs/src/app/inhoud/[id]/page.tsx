import { notFound } from "next/navigation";
import { getPublicContentById, getSiteConfig } from "@/shared/services/publicService";
import { PublicShell } from "@/app/(public)/PublicShell";
import { SetupNotice } from "@/app/(public)/SetupNotice";
import { AssetEmbed } from "@/app/(public)/AssetEmbed";
import { SectionBand } from "@/app/(public)/SectionBand";
import { LocationMap } from "@/app/(public)/LocationMap";
import { MapPin } from "lucide-react";
import { formatDateTime } from "@/shared/lib/dateFields";

export const dynamic = "force-dynamic";

export default async function ContentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ taal?: string }>;
}) {
  const [{ id }, { taal }] = await Promise.all([params, searchParams]);

  const contentId = Number(id);
  if (!Number.isInteger(contentId) || contentId <= 0) {
    notFound();
  }

  let siteConfig;
  try {
    siteConfig = await getSiteConfig();
  } catch {
    return <SetupNotice />;
  }

  const language = taal ?? siteConfig.defaultLanguageCode;

  let content;
  try {
    content = await getPublicContentById(contentId, language);
  } catch {
    // The API reports unpublished and missing items alike as not found, so a draft
    // is never distinguishable from a non-existent page.
    notFound();
  }

  return (
    <PublicShell siteConfig={siteConfig} language={language}>
      <article className="flex flex-col gap-5 sm:gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl leading-tight font-semibold text-balance text-(--text-primary) sm:text-4xl">
            {content.title}
          </h1>

          {(content.eventStart || content.eventEnd) && (
            <p className="text-sm font-medium text-(--brand-primary)">
              {formatDateTime(content.eventStart)}
              {content.eventEnd ? ` – ${formatDateTime(content.eventEnd)}` : ""}
            </p>
          )}
        </header>

        <AssetEmbed
          assetType={content.assetType}
          assetReference={content.assetReference}
          title={content.title}
        />

        {content.description && (
          <p className="max-w-prose text-lg leading-relaxed text-pretty text-(--text-secondary)">
            {content.description}
          </p>
        )}

        {/* max-w-prose keeps line length readable once the viewport is wide. */}
        {content.body && (
          <div className="max-w-prose text-base leading-relaxed whitespace-pre-wrap text-(--text-primary)">
            {content.body}
          </div>
        )}

        {content.locations.length > 0 && (
          <section className="mt-2">
            <SectionBand title="Ligging" icon={MapPin} className="mb-6" />

            <ul className="flex flex-col gap-4">
              {content.locations.map((location) => (
                <li key={location.id}>
                  <LocationMap
                    // Falls back to the item's own name rather than the word "Ligging",
                    // which used to repeat the heading directly above it.
                    name={location.label ?? content.title}
                    latitude={location.latitude}
                    longitude={location.longitude}
                    addressLine={location.addressLine}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </PublicShell>
  );
}
