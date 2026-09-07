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
      <article className="flex flex-col gap-5">
        <h1 className="text-2xl font-semibold text-(--text-primary)">{content.title}</h1>

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
          <p className="text-base text-(--text-secondary)">{content.description}</p>
        )}

        {content.body && (
          <div className="whitespace-pre-wrap text-base text-(--text-primary)">{content.body}</div>
        )}

        {content.locations.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-semibold text-(--text-primary)">Ligging</h2>
            <ul className="flex flex-col gap-2 text-sm text-(--text-secondary)">
              {content.locations.map((location) => (
                <li key={location.id}>
                  {location.label ?? "Ligging"}
                  {location.addressLine ? ` — ${location.addressLine}` : ""}
                  <span className="ml-2 text-xs">
                    ({location.latitude}, {location.longitude})
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </PublicShell>
  );
}
