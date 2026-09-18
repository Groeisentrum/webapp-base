import { notFound } from "next/navigation";
import { getPublicContentById, getSiteConfig } from "@/shared/services/publicService";
import { PublicShell } from "@/app/(public)/PublicShell";
import { SetupNotice } from "@/app/(public)/SetupNotice";
import { AssetEmbed } from "@/app/(public)/AssetEmbed";
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
      <article className="flex flex-col gap-4 sm:gap-5">
        <h1 className="text-2xl font-semibold text-balance text-(--text-primary) sm:text-3xl">
          {content.title}
        </h1>

        {(content.eventStart || content.eventEnd) && (
          <p className="text-sm text-(--text-secondary)">
            {formatDateTime(content.eventStart)}
            {content.eventEnd ? ` – ${formatDateTime(content.eventEnd)}` : ""}
          </p>
        )}

        <AssetEmbed
          assetType={content.assetType}
          assetReference={content.assetReference}
          title={content.title}
        />

        {content.description && (
          <p className="text-base text-pretty text-(--text-secondary)">{content.description}</p>
        )}

        {/* Fixed: Renders formatted HTML */}
        {content.body && (
          <div
            className="max-w-prose text-base leading-relaxed prose text-(--text-primary)"
            dangerouslySetInnerHTML={{ __html: content.body }}
          />
        )}

        {content.locations.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-semibold text-(--text-primary)">Ligging</h2>
            <ul className="flex flex-col gap-3 text-sm text-(--text-secondary)">
              {content.locations.map((location) => (
                <li key={location.id} className="flex flex-col gap-0.5">
                  <span className="font-medium text-(--text-primary)">
                    {location.label ?? "Ligging"}
                  </span>
                  {location.addressLine && <span>{location.addressLine}</span>}
                  {/* Opens the visitor's own map app — they are usually on site. */}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center text-(--brand-primary) underline"
                  >
                    Wys op kaart
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </PublicShell>
  );
}
