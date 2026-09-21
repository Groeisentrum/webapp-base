"use client";

import { Marker, Popup } from "react-leaflet";
import type { PublicLocation } from "@/shared/interfaces/Domain";
import { boundsForPins, resolvePinColour } from "@/shared/lib/mapPins";
import { LeafletMap, createColourIcon } from "@/shared/components/map/LeafletMap";
import { LocationPopup } from "@/shared/components/map/LocationPopup";

/**
 * Only ever imported behind a `next/dynamic(ssr:false)` boundary — see the comment
 * on either KaartClient. Renders every pin it is given with zero visibility
 * filtering of its own; the API has already filtered the feed for whoever is asking.
 *
 * Shared between the public map (read-only) and the admin map (`onEdit` wires each
 * pin's popup to open it for editing, `onCreate` wires a click on empty map space to
 * start a new pin there) — the only difference between the two.
 */
export function MapView({
  locations,
  language,
  onEdit,
  onCreate,
}: {
  locations: PublicLocation[];
  language?: string;
  onEdit?: (location: PublicLocation) => void;
  /** Admin-only: fires with the clicked coordinates when empty map space is clicked. */
  onCreate?: (latitude: number, longitude: number) => void;
}) {
  const bounds = boundsForPins(locations);

  return (
    <LeafletMap bounds={bounds} onClick={onCreate}>
      {locations.map((location) => (
        <Marker
          key={location.id}
          position={[location.latitude, location.longitude]}
          icon={createColourIcon(resolvePinColour(location.categoryColour))}
        >
          <Popup>
            <LocationPopup location={location} language={language} onEdit={onEdit} />
          </Popup>
        </Marker>
      ))}
    </LeafletMap>
  );
}
