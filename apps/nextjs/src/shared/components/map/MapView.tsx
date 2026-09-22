"use client";

import { Circle, CircleMarker, Marker, Popup, useMap } from "react-leaflet";
import { Fragment, useEffect, useMemo, useRef } from "react";
import type { PublicLocation } from "@/shared/interfaces/Domain";
import { boundsForPins, resolvePinColour } from "@/shared/lib/mapPins";
import { PROXIMITY_RADIUS_METRES, type UserPosition } from "@/shared/lib/proximity";
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
  userPosition,
  nearbyLocationIds,
  revealAllDetails = true,
}: {
  locations: PublicLocation[];
  language?: string;
  onEdit?: (location: PublicLocation) => void;
  /** Admin-only: fires with the clicked coordinates when empty map space is clicked. */
  onCreate?: (latitude: number, longitude: number) => void;
  /** Visitor position for the public map; omitted by the admin map. */
  userPosition?: UserPosition | null;
  /** Pins whose exhibit details may be revealed by the public UX. */
  nearbyLocationIds?: ReadonlySet<number>;
  /** Admin maps reveal all pin details; public maps pass false. */
  revealAllDetails?: boolean;
}) {
  const bounds = useMemo(() => boundsForPins(locations), [locations]);

  return (
    <LeafletMap bounds={bounds} onClick={onCreate}>
      {userPosition && <PanToUser position={userPosition} />}
      {userPosition && (
        <>
          <Circle
            center={[userPosition.latitude, userPosition.longitude]}
            radius={PROXIMITY_RADIUS_METRES}
            pathOptions={{
              color: "var(--brand-primary)",
              fillColor: "var(--brand-primary)",
              fillOpacity: 0.04,
              weight: 2,
              dashArray: "6 5",
            }}
          >
            <Popup>
              Nabyheidsradius
              <br />
              Volledige inligting binne {PROXIMITY_RADIUS_METRES} m
            </Popup>
          </Circle>
          <CircleMarker
            center={[userPosition.latitude, userPosition.longitude]}
            radius={8}
            pathOptions={{
              color: "var(--panel-bg)",
              fillColor: "var(--brand-primary)",
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Popup>Jou ligging</Popup>
          </CircleMarker>
        </>
      )}

      {locations.map((location) => (
        <Fragment key={location.id}>
          {nearbyLocationIds?.has(location.id) === true && (
            <CircleMarker
              center={[location.latitude, location.longitude]}
              radius={13}
              interactive={false}
              pathOptions={{
                color: resolvePinColour(location.categoryColour),
                fillOpacity: 0,
                weight: 3,
              }}
            />
          )}
          <Marker
            position={[location.latitude, location.longitude]}
            icon={createColourIcon(resolvePinColour(location.categoryColour))}
          >
            <Popup>
              <LocationPopup
                location={location}
                language={language}
                onEdit={onEdit}
                isDetailsVisible={
                  revealAllDetails !== false || nearbyLocationIds?.has(location.id) === true
                }
              />
            </Popup>
          </Marker>
        </Fragment>
      ))}
    </LeafletMap>
  );
}

/** Centers the map on the visitor once, without fighting manual map movement. */
function PanToUser({ position }: { position: UserPosition }) {
  const map = useMap();
  const hasPanned = useRef(false);

  useEffect(() => {
    if (hasPanned.current) return;

    map.setView([position.latitude, position.longitude], Math.max(map.getZoom(), 16));
    hasPanned.current = true;
  }, [map, position]);

  return null;
}
