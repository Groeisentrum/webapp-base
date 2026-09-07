import { getSiteConfig } from "@/shared/services/publicService";
import { PublicShell } from "@/app/(public)/PublicShell";
import { SetupNotice } from "@/app/(public)/SetupNotice";

export const dynamic = "force-dynamic";

/**
 * Terms of service.
 *
 * PER-CLIENT: deliberately minimal — commerce is out of scope for now. Replace with
 * reviewed wording before a deployment goes live, and extend when sales features land.
 */
export default async function TermsPage() {
  let siteConfig;
  try {
    siteConfig = await getSiteConfig();
  } catch {
    return <SetupNotice />;
  }

  return (
    <PublicShell siteConfig={siteConfig} language={siteConfig.defaultLanguageCode}>
      <article className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-(--text-primary)">Bepalings en voorwaardes</h1>

        <p className="text-sm text-(--text-secondary)">
          Deur {siteConfig.siteName} te gebruik, stem jy in tot hierdie bepalings.
        </p>

        <section>
          <h2 className="mb-1 text-lg font-medium text-(--text-primary)">Gebruik van die werf</h2>
          <p className="text-sm text-(--text-secondary)">
            Die inhoud op hierdie werf word verskaf vir inligtingsdoeleindes. Jy mag dit
            nie sonder toestemming herversprei nie.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-lg font-medium text-(--text-primary)">Rekeninge</h2>
          <p className="text-sm text-(--text-secondary)">
            Jy is verantwoordelik vir die veiligheid van jou aanmeldbesonderhede en vir
            aktiwiteit onder jou rekening.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-lg font-medium text-(--text-primary)">Veranderinge</h2>
          <p className="text-sm text-(--text-secondary)">
            Ons kan hierdie bepalings van tyd tot tyd bywerk. Voortgesette gebruik van die
            werf beteken jy aanvaar die bygewerkte bepalings.
          </p>
        </section>
      </article>
    </PublicShell>
  );
}
