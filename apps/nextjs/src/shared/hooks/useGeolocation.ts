"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UserPosition } from "@/shared/lib/proximity";

export type GeolocationStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "denied"
  | "unavailable"
  | "timeout"
  | "error";

/**
 * Owns the browser's live location watch for the public map.
 *
 * Location is requested only after an explicit visitor action. Keeping the watch
 * here, rather than in the map renderer, means the map can remain useful when a
 * visitor denies permission and guarantees that the watch is cleared on unmount.
 */
export function useGeolocation() {
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const [position, setPosition] = useState<UserPosition | null>(null);
  const watchId = useRef<number | null>(null);

  const clearWatch = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }

    clearWatch();
    setStatus("requesting");

    watchId.current = navigator.geolocation.watchPosition(
      (nextPosition) => {
        setPosition({
          latitude: nextPosition.coords.latitude,
          longitude: nextPosition.coords.longitude,
          accuracy: nextPosition.coords.accuracy,
        });
        setStatus("ready");
      },
      (error) => {
        if (error.code === 1) {
          setStatus("denied");
        } else if (error.code === 2) {
          setStatus("unavailable");
        } else if (error.code === 3) {
          setStatus("timeout");
        } else {
          setStatus("error");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 10_000,
      },
    );
  }, [clearWatch]);

  useEffect(() => clearWatch, [clearWatch]);

  return { status, position, requestLocation };
}
