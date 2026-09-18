"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import type { SimpleBounds } from "@/shared/lib/mapPins";

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bydraers';

// Free OSM tiles are fine for this template and for local/demo traffic. A
// deployment expecting sustained public traffic should move to a paid tile
// provider or a caching proxy in front of OSM — see their tile usage policy.
const DEFAULT_CENTER: [number, number] = [0, 0];
const DEFAULT_ZOOM = 2;

/**
 * Shared Leaflet chrome: tile layer, attribution, and the one-time
 * `leaflet/dist/leaflet.css` import. Both the public map and the admin
 * click-to-set-pin picker render through this so tile setup exists in exactly
 * one place. Callers must import this only from a component already behind a
 * `next/dynamic(..., { ssr: false })` boundary — Leaflet touches `window` at
 * module-evaluation time, so it must never reach the server bundle.
 */
export function LeafletMap({
  center,
  zoom,
  bounds,
  className,
  children,
  onClick,
}: {
  center?: [number, number];
  zoom?: number;
  /** When set, the map fits this box instead of using `center`/`zoom`. */
  bounds?: SimpleBounds | null;
  className?: string;
  children?: React.ReactNode;
  onClick?: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer
      center={center ?? DEFAULT_CENTER}
      zoom={zoom ?? DEFAULT_ZOOM}
      className={className ?? "h-full w-full"}
      scrollWheelZoom
    >
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
      {bounds && <FitBounds bounds={bounds} />}
      {onClick && <ClickHandler onClick={onClick} />}
      {children}
    </MapContainer>
  );
}

function FitBounds({ bounds }: { bounds: SimpleBounds }) {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(
      [
        [bounds.southWest.lat, bounds.southWest.lng],
        [bounds.northEast.lat, bounds.northEast.lng],
      ],
      { padding: [32, 32], maxZoom: 17 },
    );
  }, [map, bounds]);

  return null;
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  const map = useMap();

  useEffect(() => {
    const handler = (event: L.LeafletMouseEvent) => onClick(event.latlng.lat, event.latlng.lng);
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [map, onClick]);

  return null;
}

/**
 * A round pin icon in the given colour, built from a div rather than Leaflet's
 * bundled marker images — those don't resolve correctly under Next's bundler, and
 * a plain coloured dot is all the public map and the admin picker need.
 */
export function createColourIcon(colour: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:${colour};border:2px solid var(--panel-bg);box-shadow:0 0 0 1px var(--panel-border);"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
}
