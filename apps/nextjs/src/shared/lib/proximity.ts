/**
 * Geographic data used by the visitor-location experience.
 *
 * The browser is only using this information to improve the visitor's experience;
 * it is not an access-control mechanism. The public API continues to return the
 * existing location contract, and these checks only decide what the UI reveals.
 */
export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type UserPosition = Coordinates & {
  /** Accuracy reported by the browser, in metres. */
  accuracy: number;
};

/** Initial walking-distance threshold for revealing exhibit information. */
export const PROXIMITY_RADIUS_METRES = 20;

const EARTH_RADIUS_METRES = 6_371_000;

/**
 * Returns the shortest surface distance between two latitude/longitude points.
 *
 * Latitude and longitude are angles, not a flat Cartesian grid, so comparing their
 * raw differences would produce incorrect distances, especially as longitude lines
 * converge. The Haversine formula is accurate enough for a walking-scale UX rule.
 */
export function distanceInMetres(from: Coordinates, to: Coordinates): number {
  const latitudeDifference = toRadians(to.latitude - from.latitude);
  const longitudeDifference = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDifference / 2) ** 2;

  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

/** Returns true when the visitor is inside the visual reveal radius. */
export function isWithinProximity(
  from: Coordinates,
  to: Coordinates,
  radiusMetres = PROXIMITY_RADIUS_METRES,
): boolean {
  if (!isValidCoordinates(from) || !isValidCoordinates(to) || radiusMetres < 0) {
    return false;
  }

  return distanceInMetres(from, to) <= radiusMetres;
}

/** Formats a walking-scale distance compactly for a mobile nearby list. */
export function formatDistanceInMetres(distanceMetres: number): string {
  if (distanceMetres >= 1000) {
    return `${(distanceMetres / 1000).toFixed(1)} km`;
  }

  return `${Math.round(distanceMetres)} m`;
}

function isValidCoordinates(coordinates: Coordinates): boolean {
  return (
    Number.isFinite(coordinates.latitude) &&
    coordinates.latitude >= -90 &&
    coordinates.latitude <= 90 &&
    Number.isFinite(coordinates.longitude) &&
    coordinates.longitude >= -180 &&
    coordinates.longitude <= 180
  );
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
