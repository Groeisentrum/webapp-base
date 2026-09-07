import Link from "next/link";
import type { PublicContent } from "@/shared/interfaces/Domain";
import { formatDateTime } from "@/shared/lib/dateFields";

export function ContentCard({
  content,
  language,
}: {
  content: PublicContent;
  language: string;
}) {
  return (
    <Link
      href={`/inhoud/${content.id}?taal=${encodeURIComponent(language)}`}
      className="block h-full rounded-lg border border-(--panel-border) bg-(--panel-bg) p-4 hover:border-(--brand-primary)"
    >
      <h3 className="text-base font-medium text-(--text-primary)">{content.title}</h3>

      {content.description && (
        <p className="mt-1 line-clamp-3 text-sm text-(--text-secondary)">{content.description}</p>
      )}

      {content.eventStart && (
        <p className="mt-2 text-xs text-(--text-secondary)">
          Geleentheid: {formatDateTime(content.eventStart)}
        </p>
      )}
    </Link>
  );
}
