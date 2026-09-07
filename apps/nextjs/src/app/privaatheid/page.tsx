import { getSiteConfig } from "@/shared/services/publicService";
import { PublicShell } from "@/app/(public)/PublicShell";
import { SetupNotice } from "@/app/(public)/SetupNotice";

export const dynamic = "force-dynamic";

/**
 * POPIA privacy notice.
 *
 * PER-CLIENT: this copy is a starting point, not legal text. Each deployment must
 * have it reviewed and replaced with wording that matches what that client actually
 * collects and why.
 */
export default async function PrivacyPage() {
  let siteConfig;
  try {
    siteConfig = await getSiteConfig();
  } catch {
    return <SetupNotice />;
  }

  return (
    <PublicShell siteConfig={siteConfig} language={siteConfig.defaultLanguageCode}>
      <article className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-(--text-primary)">Privaatheidsbeleid</h1>

        <p className="text-sm text-(--text-secondary)">
          Hierdie beleid verduidelik hoe {siteConfig.siteName} persoonlike inligting
          insamel, gebruik en beskerm ingevolge die Wet op die Beskerming van Persoonlike
          Inligting (POPIA).
        </p>

        <section>
          <h2 className="mb-1 text-lg font-medium text-(--text-primary)">
            Watter inligting ons insamel
          </h2>
          <p className="text-sm text-(--text-secondary)">
            Ons samel slegs die inligting in wat nodig is om jou toegang tot die werf te
            bestuur, byvoorbeeld jou naam en e-posadres.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-lg font-medium text-(--text-primary)">Hoe ons dit gebruik</h2>
          <p className="text-sm text-(--text-secondary)">
            Jou inligting word gebruik om jou aan te meld, jou toegangsregte te bepaal en
            met jou te kommunikeer oor die diens.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-lg font-medium text-(--text-primary)">Jou regte</h2>
          <p className="text-sm text-(--text-secondary)">
            Jy het die reg om toegang tot jou inligting te versoek, dit te laat regstel of
            die verwydering daarvan te versoek. Kontak ons by{" "}
            {siteConfig.contactInfo.emailAddress ?? "die kontakadres hieronder"}.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-lg font-medium text-(--text-primary)">Toestemming</h2>
          <p className="text-sm text-(--text-secondary)">
            Deur &apos;n profiel te skep, stem jy toe dat ons jou inligting soos hierbo
            beskryf verwerk. Jy kan hierdie toestemming te eniger tyd terugtrek.
          </p>
        </section>
      </article>
    </PublicShell>
  );
}
