import { MonumentOutline } from "@/features/events/MonumentOutline";
import styles from "@/features/events/Events.module.css";
import Link from "next/link";
import type { CSSProperties } from "react";
import { getEventPreview } from "@/features/events/previewData";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Gebeure en ervarings",
  robots: { index: false, follow: false },
};

export default async function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getEventPreview();
  const style = {
    "--brand-primary": data.branding.primary,
    "--brand-secondary": data.branding.secondary,
    "--brand-accent": data.branding.accent,
    "--focus-ring": data.branding.primary,
  } as CSSProperties;
  return (
    <div style={style} className={`min-h-screen ${styles.monumentPage}`}>
      <MonumentOutline />
      <a
        href="#preview-main"
        className="sr-only focus:not-sr-only focus:block focus:p-4"
      >
        Spring na inhoud
      </a>
      <header className="border-b border-(--panel-border) bg-(--panel-bg)">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-5">
          <Link
            href="/voorskou"
            className="flex items-center gap-3 text-(--brand-primary)"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.logo} alt="" width={40} height={40} />
            <span className="text-lg font-semibold tracking-tight">
              {data.siteName}
            </span>
          </Link>
          <nav
            aria-label="Hoofkieslys"
            className="flex gap-5 text-sm text-(--brand-primary)"
          >
            {data.navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex min-h-11 items-center border-b-2 border-transparent hover:border-(--brand-accent)"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main id="preview-main" className="mx-auto max-w-5xl px-4 py-7 sm:py-10">
        {children}
      </main>
      <footer className="mt-10 bg-(--brand-primary) px-4 py-10 text-(--text-inverse)">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-6">
          <div>
            <p className="text-xl">{data.siteName}</p>
            <p className="mt-2 text-sm">
              ’n Plek vir stories. ’n Plek vir saamwees.
            </p>
          </div>
          <div className="text-sm">
            <Link
              href="/voorskou/gebeure"
              className="inline-flex min-h-11 items-center underline"
            >
              Verken gebeure en ervarings
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
