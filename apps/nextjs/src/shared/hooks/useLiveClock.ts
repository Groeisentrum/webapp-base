"use client";

import { useEffect, useState } from "react";

const DEFAULT_INTERVAL_MS = 30_000;

/**
 * Re-renders the caller on a timer so time-relative UI (the Dagbeplanner's "running
 * late" detection) stays in sync with the real clock without a page reload. 30s by
 * default — coarse enough to avoid needless work, fine enough that a delay badge
 * feels live rather than stale.
 */
export function useLiveClock(intervalMs: number = DEFAULT_INTERVAL_MS): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);

    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
