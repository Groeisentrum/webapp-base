import { describe, expect, it } from "vitest";
import {
  distanceInMetres,
  formatDistanceInMetres,
  isWithinProximity,
  PROXIMITY_RADIUS_METRES,
} from "@/shared/lib/proximity";

describe("distanceInMetres", () => {
  it("returns zero for the same point", () => {
    expect(distanceInMetres({ latitude: -25.7766, longitude: 28.1753 }, { latitude: -25.7766, longitude: 28.1753 })).toBe(0);
  });

  it("calculates a walking-scale distance rather than comparing raw degrees", () => {
    const distance = distanceInMetres(
      { latitude: -25.7766, longitude: 28.1753 },
      { latitude: -25.7770, longitude: 28.1753 },
    );

    expect(distance).toBeGreaterThan(40);
    expect(distance).toBeLessThan(50);
  });
});

describe("isWithinProximity", () => {
  const origin = { latitude: -25.7766, longitude: 28.1753 };

  it("uses the default 20 metre reveal radius", () => {
    expect(isWithinProximity(origin, { latitude: -25.7767, longitude: 28.1753 })).toBe(true);
    expect(isWithinProximity(origin, { latitude: -25.7769, longitude: 28.1753 })).toBe(false);
  });

  it("includes a point exactly on the radius boundary", () => {
    const latitudeForTwentyMetres =
      origin.latitude + (PROXIMITY_RADIUS_METRES / 6_371_000) * (180 / Math.PI);
    const boundary = { latitude: latitudeForTwentyMetres, longitude: origin.longitude };

    expect(distanceInMetres(origin, boundary)).toBeCloseTo(PROXIMITY_RADIUS_METRES, 8);
    expect(isWithinProximity(origin, boundary)).toBe(true);
  });

  it("accepts a caller-supplied radius", () => {
    expect(isWithinProximity(origin, { latitude: -25.7770, longitude: 28.1753 }, 30)).toBe(false);
    expect(isWithinProximity(origin, { latitude: -25.7770, longitude: 28.1753 }, 50)).toBe(true);
  });

  it("rejects invalid coordinates", () => {
    expect(isWithinProximity(origin, { latitude: 91, longitude: 28.1753 })).toBe(false);
  });

  it("exports the configured default for callers that need to describe the rule", () => {
    expect(PROXIMITY_RADIUS_METRES).toBe(20);
  });
});

describe("formatDistanceInMetres", () => {
  it("keeps short distances in metres", () => {
    expect(formatDistanceInMetres(42.4)).toBe("42 m");
  });

  it("uses kilometres for longer distances", () => {
    expect(formatDistanceInMetres(1250)).toBe("1.3 km");
  });
});
