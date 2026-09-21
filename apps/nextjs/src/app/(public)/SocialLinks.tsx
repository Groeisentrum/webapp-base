import {
  Facebook,
  Instagram,
  Linkedin,
  Link2,
  MessageCircle,
  Music2,
  Twitter,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import type { ContactInfo } from "@/shared/interfaces/Domain";
import { cn } from "@/shared/lib/cn";

/**
 * Social icons, driven entirely by tenant settings.
 *
 * The platform list is an open map rather than a fixed set, so a deployment adds a
 * platform by configuring it. An unrecognised key still renders — with a generic link
 * icon and its own name as the label — because refusing to show a link the client
 * deliberately configured would be the worse failure.
 *
 * Drawn icons rather than typed glyphs: "f" and "ig" and "▶" in a row read as text
 * that failed to load, which is exactly what they looked like.
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

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  x: Twitter,
  twitter: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  tiktok: Music2,
  whatsapp: MessageCircle,
};

export function SocialLinks({
  contactInfo,
  tone = "default",
}: {
  contactInfo: ContactInfo;
  /** "inverse" for the footer, where the ground is the brand colour rather than panel. */
  tone?: "default" | "inverse";
}) {
  const entries = Object.entries(contactInfo.socialLinks ?? {}).filter(([, url]) => Boolean(url));

  if (entries.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Sosiale media" className="flex items-center gap-0.5">
      {entries.map(([platform, url]) => {
        const key = platform.toLowerCase();
        const label = PLATFORM_LABELS[key] ?? platform;
        const Icon = PLATFORM_ICONS[key] ?? Link2;

        return (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-md transition motion-reduce:transition-none",
              tone === "inverse"
                ? "text-(--text-inverse)/70 hover:bg-(--text-inverse)/10 hover:text-(--text-inverse)"
                : "text-(--text-secondary) hover:bg-(--page-bg) hover:text-(--brand-primary)",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </a>
        );
      })}
    </nav>
  );
}
