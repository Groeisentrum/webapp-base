"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { PublicLocation } from "@/shared/interfaces/Domain";
import { collectPinCategories } from "@/shared/lib/mapPins";
import {
  distanceInMetres,
  formatDistanceInMetres,
  isWithinProximity,
  PROXIMITY_RADIUS_METRES,
} from "@/shared/lib/proximity";
import { useGeolocation } from "@/shared/hooks/useGeolocation";
import { Alert, Button, EmptyState, Spinner } from "@/shared/components/ui";
import { MapLegend } from "@/shared/components/map/MapLegend";

// MapView imports react-leaflet/leaflet, which touch `window` at module-evaluation
// time — it must never reach the server bundle, hence ssr:false rather than just a
// "use client" directive.
const MapView = dynamic(
  () => import("@/shared/components/map/MapView").then((mod) => mod.MapView),
  { ssr: false, loading: () => <Spinner label="Kaart laai tans..." /> },
);

export function KaartClient({
  locations,
  language,
}: {
  locations: PublicLocation[];
  language: string;
}) {
  const categories = useMemo(() => collectPinCategories(locations), [locations]);
  const [activeSlugs, setActiveSlugs] = useState<Set<string> | null>(null);
  // Deliberately keep this in component state: it is a temporary display choice,
  // not permission to persist or share the visitor's location.
  const [showAllDetails, setShowAllDetails] = useState(false);
  const { status: geolocationStatus, position, requestLocation } = useGeolocation();

  const visibleLocations = useMemo(() => {
    if (activeSlugs === null) return locations;
    return locations.filter((location) => activeSlugs.has(location.categorySlug));
  }, [locations, activeSlugs]);

  const nearbyLocations = useMemo(() => {
    if (!position) return [];

    return visibleLocations
      .filter((location) =>
        isWithinProximity(position, location, PROXIMITY_RADIUS_METRES),
      )
      .map((location) => ({
        location,
        distance: distanceInMetres(position, location),
      }))
      .sort((left, right) => left.distance - right.distance);
  }, [visibleLocations, position]);

  const nearbyLocationIds = useMemo(
    () => new Set(nearbyLocations.map(({ location }) => location.id)),
    [nearbyLocations],
  );

  function toggleCategory(slug: string) {
    setActiveSlugs((current) => {
      const base = current ?? new Set(categories.map((category) => category.categorySlug));
      const next = new Set(base);

      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }

      return next;
    });
  }

  if (locations.length === 0) {
    return <EmptyState message="Nog geen liggings nie." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-(--panel-border) bg-(--panel-bg) p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-(--text-primary)">Vind jou ligging</h2>
            <p className="mt-1 text-sm text-(--text-secondary)">
              Volledige uitstalling-inligting verskyn binne {PROXIMITY_RADIUS_METRES} m van ’n punt.
              Jy kan dit ook vir hierdie sessie oopmaak sonder om naby te wees.
            </p>
            <p className="mt-2 text-xs text-(--text-secondary)">
              Die gestippelde sirkel op die kaart wys die {PROXIMITY_RADIUS_METRES} m-nabyheidsradius.
            </p>
          </div>
          <Button
            className="min-h-11 w-full shrink-0 sm:w-auto"
            onClick={requestLocation}
            disabled={geolocationStatus === "requesting"}
          >
            {geolocationStatus === "requesting"
              ? "Ligging word opgespoor..."
              : position
                ? "Verfris my ligging"
                : "Wys my ligging"}
          </Button>
        </div>

        {geolocationStatus === "denied" && (
          <Alert tone="warning">
            Liggingtoegang is geweier. Skakel dit in jou blaaier se instellings aan om nabygeleë
            uitstallings te sien.
          </Alert>
        )}
        {geolocationStatus === "unavailable" && (
          <Alert tone="warning">Jou ligging is tans nie beskikbaar nie. Probeer later weer.</Alert>
        )}
        {geolocationStatus === "timeout" && (
          <Alert tone="warning">Dit het te lank geneem om jou ligging te kry. Probeer weer.</Alert>
        )}
        {geolocationStatus === "error" && (
          <Alert tone="warning">Ons kon nie jou ligging kry nie. Probeer weer.</Alert>
        )}

        <div className="space-y-2 border-t pt-3">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full sm:w-auto"
            aria-pressed={showAllDetails}
            onClick={() => setShowAllDetails((current) => !current)}
          >
            {showAllDetails ? "Versteek inligting" : "Sien alle inligting"}
          </Button>
          <p className="text-xs text-(--text-secondary)">
            {showAllDetails
              ? "Alle uitstalling-inligting is sigbaar. Hierdie keuse word net vir hierdie sessie gehou."
              : "Gebruik hierdie opsie as jy alle uitstalling-inligting wil sien sonder om naby te wees."}
          </p>
        </div>
      </section>

      {position && nearbyLocations.length > 0 && (
        <section
          aria-live="polite"
          className="rounded-lg border border-(--panel-border) bg-(--panel-bg) p-4"
        >
          <h2 className="text-base font-semibold text-(--text-primary)">
            Jy is naby {nearbyLocations.length === 1 ? "'n uitstalling" : "uitstallings"}
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {nearbyLocations.map(({ location, distance }) => (
              <li
                key={location.id}
                className="flex flex-col gap-1 rounded-md border border-(--panel-border) p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-(--text-primary)">{location.name}</p>
                  <p className="text-sm text-(--text-secondary)">
                    Ongeveer {formatDistanceInMetres(distance)} weg
                  </p>
                </div>
                <a
                  href={`/inhoud/${location.contentId}?taal=${encodeURIComponent(language)}`}
                  className="inline-flex min-h-11 items-center text-sm text-(--brand-primary) underline"
                >
                  Meer inligting
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {position && nearbyLocations.length === 0 && !showAllDetails && (
        <div aria-live="polite">
          <Alert tone="warning">
            Geen uitstalling is tans binne {PROXIMITY_RADIUS_METRES} m van jou ligging nie.
          </Alert>
        </div>
      )}

      {categories.length > 1 && (
        <MapLegend categories={categories} activeSlugs={activeSlugs} onToggle={toggleCategory} />
      )}

      <div className="h-[60vh] min-h-80 overflow-hidden rounded-lg border border-(--panel-border) sm:h-[70vh]">
        <MapView
          locations={visibleLocations}
          language={language}
          userPosition={position}
          nearbyLocationIds={nearbyLocationIds}
          revealAllDetails={showAllDetails}
        />
      </div>
    </div>
  );
}
