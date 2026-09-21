import { Suspense } from "react";
import Link from "next/link";
import { MenuType } from "@/shared/interfaces/Domain";
import type {
  CategoryTreeNode,
  MenuItem,
  PublicSiteConfig,
} from "@/shared/interfaces/Domain";
import {
  getPublicCategories,
  getPublicMenuItems,
} from "@/shared/services/publicService";
import {
  buildCategorySlugs,
  buildMenuHref,
  buildMenuTree,
} from "@/shared/lib/menuTree";
import { LanguageSwitcher } from "@/app/(public)/LanguageSwitcher";
import { BottomHoverMenu } from "@/app/(public)/BottomHoverMenu";
import { SessionMenu } from "@/app/(public)/SessionMenu";
import { SocialLinks } from "@/app/(public)/SocialLinks";
import { DagbeplannerRoot } from "@/app/(public)/dagbeplanner/DagbeplannerRoot";

/**
 * Frame for every public page: brand tokens, navigation, language switcher and footer.
 *
 * Laid out mobile-first. Visitors commonly arrive here from an NFC tap or a QR code
 * while standing on site, so a phone is the expected screen rather than a fallback.
 *
 * Branding colours are injected as CSS custom properties so a deployment restyles
 * itself from TenantSettings without a rebuild.
 *
 * Every menu is fetched, never hardcoded. The API has already filtered each one for
 * whoever is asking, so what arrives here is exactly what this visitor may see.
 */
export async function PublicShell({
  siteConfig,
  language,
  hero,
  children,
}: {
  siteConfig: PublicSiteConfig;
  language: string;
  /** Rendered full-bleed above the navigation bar, which docks relative to it. */
  hero?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { categories, topMenu, bottomMenu, footerMenu } =
    await loadNavigation(language);

  const brandingStyle = buildBrandingStyle(siteConfig);
  const categorySlugs = buildCategorySlugs(categories);

  return (
    <div style={brandingStyle} className="flex min-h-screen">
      {/* Squeeze layout: DagbeplannerRoot's desktop sidebar is a flex sibling of this
          wrapper, not an overlay, so opening it genuinely narrows this column rather
          than floating on top of it. */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="border-b border-(--panel-border) bg-(--panel-bg)">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 sm:py-4">
            <Link
              href={`/?taal=${encodeURIComponent(language)}`}
              className="min-w-0 truncate text-base font-semibold text-(--text-primary) sm:text-lg"
            >
              {siteConfig.siteName}
            </Link>

            <div className="flex items-center gap-1">
              <nav aria-label="Sekondêre kieslys" className="flex items-center">
                {buildMenuTree(topMenu).map((item) => {
                  const href = buildMenuHref(item, categorySlugs, language);
                  if (!href) return null;

                  return (
                    <Link
                      key={item.id}
                      href={href}
                      className="inline-flex min-h-11 items-center px-2.5 text-sm text-(--text-secondary) hover:text-(--text-primary)"
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <SessionMenu language={language} />

              {/* Suspense because the switcher reads the query string to preserve the route. */}
              <Suspense fallback={null}>
                <LanguageSwitcher
                  activeLanguageCodes={siteConfig.activeLanguageCodes}
                  language={language}
                />
              </Suspense>

              <SocialLinks contactInfo={siteConfig.contactInfo} />
            </div>
          </div>
        </header>

        {hero}

        <BottomHoverMenu
          items={bottomMenu}
          categories={categories}
          language={language}
        />

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
          {children}
        </main>

        <footer className="border-t border-(--panel-border) bg-(--panel-bg)">
          <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-(--text-secondary)">
            {footerMenu.length > 0 && (
              <nav aria-label="Werfkaart" className="mb-6">
                <h2 className="mb-2 text-xs font-semibold tracking-wide text-(--text-primary) uppercase">
                  Werfkaart
                </h2>

                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
                  {buildMenuTree(footerMenu).map((item) => {
                    const href = buildMenuHref(item, categorySlugs, language);

                    return (
                      <li key={item.id}>
                        {href ? (
                          <Link
                            href={href}
                            className="inline-flex min-h-11 items-center hover:text-(--text-primary)"
                          >
                            {item.label}
                          </Link>
                        ) : (
                          <span className="inline-flex min-h-11 items-center">
                            {item.label}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}

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
              <Link
                href="/privaatheid"
                className="inline-flex min-h-11 items-center underline"
              >
                Privaatheidsbeleid
              </Link>
              <Link
                href="/bepalings"
                className="inline-flex min-h-11 items-center underline"
              >
                Bepalings en voorwaardes
              </Link>
            </nav>
          </div>
        </footer>
      </div>

      <DagbeplannerRoot />
    </div>
  );
}

/**
 * Loads the three menus and the category tree in one go.
 *
 * Navigation failing must not take the page with it — a visitor standing in front of
 * an exhibit needs the content far more than the menu around it, so a failure here
 * degrades to an unnavigated page rather than an error.
 */
async function loadNavigation(language: string): Promise<{
  categories: CategoryTreeNode[];
  topMenu: MenuItem[];
  bottomMenu: MenuItem[];
  footerMenu: MenuItem[];
}> {
  try {
    const [categories, topMenu, bottomMenu, footerMenu] = await Promise.all([
      getPublicCategories(language),
      getPublicMenuItems(MenuType.Top, language),
      getPublicMenuItems(MenuType.BottomHover, language),
      getPublicMenuItems(MenuType.Footer, language),
    ]);

    return { categories, topMenu, bottomMenu, footerMenu };
  } catch {
    return { categories: [], topMenu: [], bottomMenu: [], footerMenu: [] };
  }
}

function buildBrandingStyle(siteConfig: PublicSiteConfig): React.CSSProperties {
  const style: Record<string, string> = {};
  const branding = siteConfig.branding;

  if (branding.primaryColour) style["--brand-primary"] = branding.primaryColour;
  if (branding.secondaryColour)
    style["--brand-secondary"] = branding.secondaryColour;
  if (branding.accentColour) style["--brand-accent"] = branding.accentColour;

  return style as React.CSSProperties;
}
