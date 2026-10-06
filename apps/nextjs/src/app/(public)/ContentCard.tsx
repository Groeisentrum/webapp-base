import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import type { PublicContent } from "@/shared/interfaces/Domain";
import { formatDateTime } from "@/shared/lib/dateFields";
import { CardMedia } from "@/app/(public)/CardMedia";

/**
 * One item in a list of places or events.
 *
 * Picture first, then the name, then a line about it — the order a visitor deciding
 * where to walk next actually reads in. The whole card is the target rather than a
 * "read more" link, because the expected tap is a thumb on a phone held one-handed.
 */
export function ContentCard({
  content,
  language,
}: {
  content: PublicContent;
  language: string;
}) {
  const hasLocation = content.locations.length > 0;

  return (
    <Link
      href={`/inhoud/${content.id}?taal=${encodeURIComponent(language)}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-(--panel-border) bg-(--panel-bg) transition hover:border-(--brand-primary) hover:shadow-md motion-reduce:transition-none"
    >
      <CardMedia
        assetType={content.assetType}
        assetReference={content.assetReference}
        title={content.title}
      />

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="text-base leading-snug font-semibold text-(--text-primary) group-hover:text-(--brand-primary)">
          {content.title}
        </h3>

        {content.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-(--text-secondary)">
            {content.description}
          </p>
        )}

        {/* Pushed to the bottom so cards in a row line their metadata up even when
            their descriptions run to different lengths. */}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-(--text-secondary)">
          {content.eventStart && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDateTime(content.eventStart)}
            </span>
          )}

          {hasLocation && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Op die terrein
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
