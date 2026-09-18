"use client";

import { useQuery } from "@tanstack/react-query";
import { Alert, Panel, Spinner } from "@/shared/components/ui";
import { getPublicLocations } from "@/shared/services/publicService";
import { getSafeUserMessageFromUnknownError } from "@/shared/lib/apiError";
import { KaartClient } from "@/app/admin/kaart/KaartClient";

export default function AdminKaartPage() {
  const locationsQuery = useQuery({
    queryKey: ["public-locations"],
    queryFn: () => getPublicLocations({}),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-(--text-primary)">Kaart</h1>

      {locationsQuery.isLoading && <Spinner />}

      {locationsQuery.isError && (
        <Alert tone="warning">{getSafeUserMessageFromUnknownError(locationsQuery.error)}</Alert>
      )}

      {locationsQuery.data && (
        <Panel>
          <KaartClient locations={locationsQuery.data} />
        </Panel>
      )}
    </div>
  );
}
