import { getPublicLocations, getSiteConfig } from "@/shared/services/publicService";
import { PublicShell } from "@/app/(public)/PublicShell";
import { SetupNotice } from "@/app/(public)/SetupNotice";
import { Alert } from "@/shared/components/ui";
import { KaartClient } from "@/app/public/kaart/KaartClient";
import type { PublicLocation } from "@/shared/interfaces/Domain";

export const dynamic = "force-dynamic";

export default async function KaartPage({
  searchParams,
}: {
  searchParams: Promise<{ taal?: string }>;
}) {
  const { taal } = await searchParams;

  let siteConfig;
  try {
    siteConfig = await getSiteConfig();
  } catch {
    return <SetupNotice />;
  }

  const language = taal ?? siteConfig.defaultLanguageCode;

  let locations: PublicLocation[] = [];
  let loadFailed = false;
  try {
    locations = await getPublicLocations({ language });
  } catch {
    loadFailed = true;
  }

  return (
    <PublicShell siteConfig={siteConfig} language={language}>
      <h1 className="mb-5 text-2xl font-semibold text-balance text-(--text-primary) sm:mb-6 sm:text-3xl">
        Kaart
      </h1>

      {loadFailed && (
        <Alert tone="warning">Kon nie liggings tans laai nie. Probeer gerus weer.</Alert>
      )}

      {!loadFailed && <KaartClient locations={locations} language={language} />}
    </PublicShell>
  );
}
