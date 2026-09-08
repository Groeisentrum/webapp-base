"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { buildLanguageHref } from "@/shared/lib/languageHref";

/**
 * Switches language while staying on the current page.
 *
 * Two presentations rather than one: a deployment may run up to eleven languages,
 * and eleven inline links do not fit a phone header. Below `sm` the same choices
 * become a native select, which also gives a comfortable tap target for free.
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

  if (activeLanguageCodes.length <= 1) {
    return null;
  }

  const hrefFor = (code: string) => buildLanguageHref(pathname, searchParams.toString(), code);

  return (
    <>
      <label className="sm:hidden">
        <span className="sr-only">Taal</span>
        <select
          value={language}
          disabled={isPending}
          onChange={(event) => {
            const href = hrefFor(event.target.value);
            startTransition(() => router.push(href));
          }}
          className="min-h-11 rounded-md border border-(--panel-border) bg-(--panel-bg) px-3 py-2 text-sm text-(--text-primary)"
        >
          {activeLanguageCodes.map((code) => (
            <option key={code} value={code}>
              {code.toUpperCase()}
            </option>
          ))}
        </select>
      </label>

      <nav aria-label="Taal" className="hidden flex-wrap gap-1 sm:flex">
        {activeLanguageCodes.map((code) => {
          const isActive = code === language;

          return (
            <a
              key={code}
              href={hrefFor(code)}
              aria-current={isActive ? "true" : undefined}
              className={
                isActive
                  ? "rounded-md bg-(--brand-primary) px-2.5 py-1.5 text-xs font-medium text-(--text-inverse)"
                  : "rounded-md px-2.5 py-1.5 text-xs text-(--text-secondary) hover:text-(--text-primary)"
              }
            >
              {code.toUpperCase()}
            </a>
          );
        })}
      </nav>
    </>
  );
}
