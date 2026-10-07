"use client";

import { resolvePinColour } from "@/shared/lib/mapPins";

type PinCategory = { categorySlug: string; categoryName: string; categoryColour: string | null };

/**
 * Category filter chips, keyed on `categorySlug` per the locations contract — the
 * name is translated and changes with language, the slug does not.
 */
export function MapLegend({
  categories,
  activeSlugs,
  onToggle,
}: {
  categories: PinCategory[];
  /** null means "every category is active" (nothing has been toggled yet). */
  activeSlugs: Set<string> | null;
  onToggle: (slug: string) => void;
}) {
  return (
    <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter volgens kategorie">
      {categories.map((category) => {
        const isActive = activeSlugs === null || activeSlugs.has(category.categorySlug);

        return (
          <li key={category.categorySlug} className="shrink-0">
            <button
              type="button"
              onClick={() => onToggle(category.categorySlug)}
              aria-pressed={isActive}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-(--panel-border) px-3 text-sm text-(--text-secondary) transition data-[active=true]:border-(--brand-primary) data-[active=true]:text-(--text-primary)"
              data-active={isActive}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: resolvePinColour(category.categoryColour) }}
                aria-hidden
              />
              {category.categoryName}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
