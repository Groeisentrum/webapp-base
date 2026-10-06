"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { buildLanguageHref } from "@/shared/lib/languageHref";
import { languageAbbreviation, languageName } from "@/shared/lib/languageLabels";

/**
 * Switches language while staying on the current page.
 *
 * One compact dropdown at every breakpoint rather than a row of links. A deployment
 * may run up to eleven languages, and eleven inline links fit neither a phone header
 * nor a desktop one — while a native select stays one control at any length and
 * brings keyboard and screen-reader behaviour with it.
 */
export function LanguageSwitcher({
  activeLanguageCodes,
  language,
}: {
  activeLanguageCodes: string[];
  language: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // A site with one language has no choice to offer.
  if (activeLanguageCodes.length <= 1) {
    return null;
  }

  return (
    <label className="inline-flex items-center">
      <span className="sr-only">Taalvoorkeur</span>
      <select
        value={language}
        disabled={isPending}
        onChange={(event) => {
          const href = buildLanguageHref(pathname, searchParams.toString(), event.target.value);
          startTransition(() => router.push(href));
        }}
        className="min-h-11 cursor-pointer rounded-md border border-(--panel-border) bg-(--panel-bg) px-3 py-1 text-xs font-semibold tracking-wide text-(--text-primary) uppercase transition hover:border-(--brand-primary) motion-reduce:transition-none"
      >
        {activeLanguageCodes.map((code) => (
          <option key={code} value={code} title={languageName(code)}>
            {languageAbbreviation(code)}
          </option>
        ))}
      </select>
    </label>
  );
}
