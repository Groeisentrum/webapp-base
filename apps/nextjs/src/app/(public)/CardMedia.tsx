import { Landmark } from "lucide-react";
import { AssetType } from "@/shared/interfaces/Domain";
import { isDisplayableImageSrc } from "@/shared/lib/assetSrc";
import { cn } from "@/shared/lib/cn";

/**
 * The picture at the top of a card.
 *
 * Every card leads with an image, because a site about a place that shows none of it
 * reads as a directory. Where a deployment has no photograph for an item — or its
 * asset host is not reachable — the brand-coloured block underneath stands in. That is
 * deliberate: the block is laid out and coloured, so a missing picture looks like a
 * card without a photograph rather than a card that is broken.
 *
 * The image sits on top of that block rather than replacing it, so a reference that
 * fails to load falls back to it with no JavaScript and no layout shift.
 */
export function CardMedia({
  assetType,
  assetReference,
  title,
  className,
}: {
  assetType: AssetType;
  assetReference: string | null;
  title: string;
  className?: string;
}) {
  const hasImage =
    assetType === AssetType.Image && isDisplayableImageSrc(assetReference);

  return (
    <div
      className={cn(
        "relative aspect-[4/3] w-full overflow-hidden bg-(--brand-primary)",
        className,
      )}
    >
      <Landmark
        className="absolute inset-0 m-auto h-10 w-10 text-(--text-inverse) opacity-25"
        aria-hidden="true"
      />

      {hasImage && (
        // Deployment asset hosts vary per client, so next/image's allowlist cannot be
        // configured at template level.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={assetReference!}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      <span className="sr-only">{title}</span>
    </div>
  );
}
