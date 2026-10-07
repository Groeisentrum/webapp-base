"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { PublicLocation } from "@/shared/interfaces/Domain";
import { collectPinCategories } from "@/shared/lib/mapPins";
import { EmptyState, Spinner } from "@/shared/components/ui";
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

  const visibleLocations = useMemo(() => {
    if (activeSlugs === null) return locations;
    return locations.filter((location) => activeSlugs.has(location.categorySlug));
  }, [locations, activeSlugs]);

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
      {categories.length > 1 && (
        <MapLegend categories={categories} activeSlugs={activeSlugs} onToggle={toggleCategory} />
      )}

      <div className="h-[60vh] min-h-80 overflow-hidden rounded-lg border border-(--panel-border) sm:h-[70vh]">
        <MapView locations={visibleLocations} language={language} />
      </div>
    </div>
  );
}
