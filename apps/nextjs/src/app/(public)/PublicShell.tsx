import Link from "next/link";
import type { PublicSiteConfig } from "@/shared/interfaces/Domain";

/**
 * Frame for every public page: brand tokens, language switcher and footer.
 *
 * Branding colours are injected as CSS custom properties so a deployment restyles
 * itself from TenantSettings without a rebuild.
 */
export function PublicShell({
  siteConfig,
  language,
  children,
}: {
  siteConfig: PublicSiteConfig;
  language: string;
  children: React.ReactNode;
}) {
  const brandingStyle = buildBrandingStyle(siteConfig);

  return (
    <div style={brandingStyle} className="min-h-screen">
      <header className="border-b border-(--panel-border) bg-(--panel-bg)">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href={`/?taal=${encodeURIComponent(language)}`} className="text-base font-semibold text-(--text-primary)">
            {siteConfig.siteName}
          </Link>

          {siteConfig.activeLanguageCodes.length > 1 && (
            <nav aria-label="Taal" className="flex gap-2">
              {siteConfig.activeLanguageCodes.map((code) => (
                <Link
                  key={code}
                  href={`/?taal=${encodeURIComponent(code)}`}
                  aria-current={code === language ? "true" : undefined}
                  className={
                    code === language
                      ? "rounded-md bg-(--brand-primary) px-2 py-1 text-xs text-(--text-inverse)"
                      : "rounded-md px-2 py-1 text-xs text-(--text-secondary) hover:text-(--text-primary)"
                  }
                >
                  {code}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>

      <footer className="border-t border-(--panel-border) bg-(--panel-bg)">
        <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-(--text-secondary)">
          {siteConfig.contactInfo.emailAddress && <p>{siteConfig.contactInfo.emailAddress}</p>}
          {siteConfig.contactInfo.phoneNumber && <p>{siteConfig.contactInfo.phoneNumber}</p>}
          <p className="mt-2">
            <Link href="/privaatheid" className="underline">
              Privaatheidsbeleid
            </Link>
            {" · "}
            <Link href="/bepalings" className="underline">
              Bepalings en voorwaardes
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

function buildBrandingStyle(siteConfig: PublicSiteConfig): React.CSSProperties {
  const style: Record<string, string> = {};
  const branding = siteConfig.branding;

  if (branding.primaryColour) style["--brand-primary"] = branding.primaryColour;
  if (branding.secondaryColour) style["--brand-secondary"] = branding.secondaryColour;
  if (branding.accentColour) style["--brand-accent"] = branding.accentColour;

  return style as React.CSSProperties;
}
