import type { ContactInfo } from "@/shared/interfaces/Domain";

/**
 * Social icons, driven entirely by tenant settings.
 *
 * The platform list is an open map rather than a fixed set, so a deployment adds a
 * platform by configuring it. An unrecognised key still renders — with its own name
 * as the label — because refusing to show a link the client deliberately configured
 * would be the worse failure.
 */
const PLATFORM_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
  twitter: "X",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
};

const PLATFORM_GLYPHS: Record<string, string> = {
  facebook: "f",
  instagram: "ig",
  x: "X",
  twitter: "X",
  youtube: "▶",
  linkedin: "in",
  tiktok: "♪",
  whatsapp: "✆",
};

export function SocialLinks({ contactInfo }: { contactInfo: ContactInfo }) {
  const entries = Object.entries(contactInfo.socialLinks ?? {}).filter(([, url]) => Boolean(url));

  if (entries.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Sosiale media" className="flex items-center gap-1">
      {entries.map(([platform, url]) => {
        const key = platform.toLowerCase();
        const label = PLATFORM_LABELS[key] ?? platform;

        return (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            className="inline-flex size-11 items-center justify-center rounded-md text-sm font-semibold text-(--text-secondary) hover:text-(--brand-primary)"
          >
            <span aria-hidden="true">{PLATFORM_GLYPHS[key] ?? label.slice(0, 2)}</span>
          </a>
        );
      })}
    </nav>
  );
}
