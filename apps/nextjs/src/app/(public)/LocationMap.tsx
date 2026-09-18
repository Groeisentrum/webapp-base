import { ExternalLink, Navigation } from "lucide-react";
import { LinkButton } from "@/shared/components/ui";

/**
 * A pin on this site, shown rather than described.
 *
 * The page used to give a visitor two numbers and a link out. Standing on the terrain
 * with a phone, what answers "where is this" is a picture of the ground — so the map
 * is embedded and the link out becomes the follow-up, for turn-by-turn directions the
 * phone's own app does better.
 *
 * OpenStreetMap's embed needs no API key and no account, which keeps a client
 * deployment from depending on someone's billing being in order. It is an iframe
 * rather than a mapping library because a static picture of one point needs neither
 * pan, zoom, clustering nor a JavaScript bundle.
 */
export function LocationMap({
  name,
  latitude,
  longitude,
  addressLine,
}: {
  name: string;
  latitude: number;
  longitude: number;
  addressLine?: string | null;
}) {
  // A box tight enough to show the building rather than the suburb.
  const span = 0.0025;
  const bbox = [
    longitude - span,
    latitude - span,
    longitude + span,
    latitude + span,
  ].join(",");

  const point = `${latitude},${longitude}`;
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(point)}`;

  return (
    <div className="overflow-hidden rounded-lg border border-(--panel-border) bg-(--panel-bg)">
      <iframe
        src={embedSrc}
        title={`Kaart van ${name}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="block aspect-[16/10] w-full border-0 sm:aspect-[2/1]"
      />

      <div className="flex flex-col gap-3 border-t border-(--panel-border) p-4">
        <div>
          <p className="text-base font-semibold text-(--text-primary)">{name}</p>
          {addressLine && (
            <p className="text-sm text-(--text-secondary)">{addressLine}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Directions first: someone reading this is usually trying to get there. */}
          <LinkButton
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(point)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Navigation className="h-4 w-4" aria-hidden="true" />
            Kry aanwysings
          </LinkButton>

          <LinkButton
            variant="secondary"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(point)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Open in kaarte
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
