import { Suspense } from "react";
import Link from "next/link";
import type { PublicSiteConfig } from "@/shared/interfaces/Domain";
import { LanguageSwitcher } from "@/app/(public)/LanguageSwitcher";

/**
 * Frame for every public page: brand tokens, language switcher and footer.
 *
 * Laid out mobile-first. Visitors commonly arrive here from an NFC tap or a QR code
 * while standing on site, so a phone is the expected screen rather than a fallback.
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
    <div style={brandingStyle} className="flex min-h-screen flex-col">
      <header className="border-b border-(--panel-border) bg-(--panel-bg)">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:py-4">
          <Link
            href={`/?taal=${encodeURIComponent(language)}`}
            className="min-w-0 truncate text-base font-semibold text-(--text-primary) sm:text-lg"
          >
            {siteConfig.siteName}
          </Link>

          {/* Suspense because the switcher reads the query string to preserve the route. */}
          <Suspense fallback={null}>
            <LanguageSwitcher
              activeLanguageCodes={siteConfig.activeLanguageCodes}
              language={language}
            />
          </Suspense>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">{children}</main>

      <footer className="border-t border-(--panel-border) bg-(--panel-bg)">
        <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-(--text-secondary)">
          {siteConfig.contactInfo.emailAddress && (
            <p className="break-words">
              <a
                href={`mailto:${siteConfig.contactInfo.emailAddress}`}
                className="inline-flex min-h-11 items-center underline"
              >
                {siteConfig.contactInfo.emailAddress}
              </a>
            </p>
          )}

          {siteConfig.contactInfo.phoneNumber && (
            <p>
              <a
                href={`tel:${siteConfig.contactInfo.phoneNumber.replace(/\s+/g, "")}`}
                className="inline-flex min-h-11 items-center underline"
              >
                {siteConfig.contactInfo.phoneNumber}
              </a>
            </p>
          )}

          {/* Stacked on a phone: two underlined links on one line are easy to mis-tap. */}
          <nav className="mt-2 flex flex-col gap-1 sm:flex-row sm:gap-4">
            <Link href="/privaatheid" className="inline-flex min-h-11 items-center underline">
              Privaatheidsbeleid
            </Link>
            <Link href="/bepalings" className="inline-flex min-h-11 items-center underline">
              Bepalings en voorwaardes
            </Link>
          </nav>
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
