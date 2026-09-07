import { AssetType } from "@/shared/interfaces/Domain";

/**
 * Renders a content item's media according to its asset type.
 *
 * Only the YouTube case builds an embed URL, and it does so from an id rather than
 * interpolating a caller-supplied URL into an iframe src. Other remote types render
 * as links so an editor-supplied reference can never become executable markup.
 */
export function AssetEmbed({
  assetType,
  assetReference,
  title,
}: {
  assetType: AssetType;
  assetReference: string | null;
  title: string;
}) {
  if (!assetReference) {
    return null;
  }

  if (assetType === AssetType.YouTube) {
    const videoId = extractYouTubeId(assetReference);
    if (!videoId) return null;

    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`}
          title={title}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (assetType === AssetType.Image) {
    return (
      // Deployment asset hosts vary per client, so next/image's allowlist cannot be
      // configured at template level.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={assetReference} alt={title} className="w-full rounded-lg" />
    );
  }

  if (assetType === AssetType.SelfHosted || assetType === AssetType.S3) {
    return (
      <video controls className="w-full rounded-lg">
        <source src={assetReference} />
      </video>
    );
  }

  if (assetType === AssetType.ExternalLink && isHttpUrl(assetReference)) {
    return (
      <a
        href={assetReference}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-(--brand-primary) underline"
      >
        Maak skakel oop
      </a>
    );
  }

  return null;
}

function extractYouTubeId(reference: string): string | null {
  // A bare id is the common case; full watch and short URLs are accepted too.
  if (/^[A-Za-z0-9_-]{11}$/.test(reference)) {
    return reference;
  }

  try {
    const url = new URL(reference);

    if (url.hostname === "youtu.be") {
      const id = url.pathname.slice(1);
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (url.hostname.endsWith("youtube.com")) {
      const id = url.searchParams.get("v");
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
  } catch {
    return null;
  }

  return null;
}

function isHttpUrl(candidate: string): boolean {
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
