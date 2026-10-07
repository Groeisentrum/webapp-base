"use client";

import { Marker } from "react-leaflet";
import { LeafletMap, createColourIcon } from "@/shared/components/map/LeafletMap";

const PICK_ICON = createColourIcon("var(--brand-primary)");

/**
 * Click-to-set coordinate picker. Only imported behind the
 * `next/dynamic(ssr:false)` boundary in LocationPanel — see the comment there.
 *
 * Centers on the current value when editing an existing pin, or a neutral world
 * view when there is none yet — never a client-specific default location.
 */
export function LocationMapPicker({
  latitude,
  longitude,
  onPick,
}: {
  latitude: number | null;
  longitude: number | null;
  onPick: (latitude: number, longitude: number) => void;
}) {
  const hasValue = latitude !== null && longitude !== null;

  return (
    <LeafletMap
      center={hasValue ? [latitude, longitude] : undefined}
      zoom={hasValue ? 16 : undefined}
      className="h-64 w-full rounded-md"
      onClick={onPick}
    >
      {hasValue && <Marker position={[latitude, longitude]} icon={PICK_ICON} />}
    </LeafletMap>
  );
}
