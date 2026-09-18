import type { PublicLocation } from "@/shared/interfaces/Domain";
import { Button } from "@/shared/components/ui";

/**
 * A pin's popup content. No photo for now — `photoReference` needs the content
 * item's `assetType` to resolve safely (see docs/LOCATIONS-CONTRACT.md#photos), so
 * the full picture lives at the linked content page rather than being guessed at here.
 *
 * `onEdit` is admin-only: passing it adds a "Wysig" action that opens that pin for
 * editing. The public map never passes it, so visitors only ever see the plain view.
 */
export function LocationPopup({
  location,
  language,
  onEdit,
}: {
  location: PublicLocation;
  /** Omitted here: the linked content page falls back to the site's default language. */
  language?: string;
  onEdit?: (location: PublicLocation) => void;
}) {
  const detailHref = language
    ? `/inhoud/${location.contentId}?taal=${encodeURIComponent(language)}`
    : `/inhoud/${location.contentId}`;

  return (
    <div className="flex max-w-64 flex-col gap-1 text-sm">
      <span
        className="inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium text-(--text-inverse)"
        style={{ background: location.categoryColour ?? "var(--text-secondary)" }}
      >
        {location.categoryName}
      </span>

      <span className="font-semibold text-(--text-primary)">{location.name}</span>

      {location.shortDescription && (
        <span className="text-(--text-secondary)">{location.shortDescription}</span>
      )}

      {location.addressLine && <span className="text-(--text-secondary)">{location.addressLine}</span>}

      <a href={detailHref} className="mt-1 text-(--brand-primary) underline">
        Meer inligting
      </a>

      {onEdit && (
        <Button variant="ghost" className="mt-1 self-start px-0" onClick={() => onEdit(location)}>
          Wysig ligging
        </Button>
      )}
    </div>
  );
}
