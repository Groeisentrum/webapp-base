import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";

/**
 * A full-width band that announces a section.
 *
 * This is the monument's own rhythm: its site breaks the page into stretches of
 * content separated by solid coloured bands, each with a small icon above a short
 * heading. It is what keeps a long page reading as a series of places rather than one
 * undifferentiated list, and it is the only thing putting the brand colour on the page
 * at all.
 *
 * The heading is uppercase here, against the sentence-case rule the rest of the site
 * follows. That is the brand's own voice rather than a decorative tracked eyebrow: it
 * appears a handful of times on a page, on a coloured ground, as structure.
 */
export function SectionBand({
  title,
  icon: Icon,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("full-bleed bg-(--brand-primary) py-5 text-center", className)}>
      {Icon && (
        <Icon
          className="mx-auto mb-2 h-6 w-6 text-(--text-inverse) opacity-90"
          aria-hidden="true"
        />
      )}

      <h2 className="px-4 text-sm font-semibold tracking-[0.12em] text-(--text-inverse) uppercase">
        {title}
      </h2>
    </div>
  );
}
