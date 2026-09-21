"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Field, Input, Spinner } from "@/shared/components/ui";
import { ConfirmDialog } from "@/shared/components/Modal";
import type { Content, LocationDetail } from "@/shared/interfaces/Domain";
import { getSafeUserMessageFromUnknownError } from "@/shared/lib/apiError";
import {
  createLocation,
  deleteLocation,
  getLocations,
  updateLocation,
  type LocationInput,
} from "@/shared/services/contentService";

// LocationMapPicker imports react-leaflet/leaflet, which touch `window` at
// module-evaluation time — it must never reach the server bundle, hence ssr:false
// rather than just a "use client" directive (same reasoning as KaartClient).
const LocationMapPicker = dynamic(
  () => import("@/shared/components/map/LocationMapPicker").then((mod) => mod.LocationMapPicker),
  { ssr: false, loading: () => <Spinner label="Kaart laai tans..." /> },
);

const emptyForm: LocationInput = {
  latitude: 0,
  longitude: 0,
  label: null,
  addressLine: null,
  notes: null,
};

/**
 * Lists, adds, edits and deletes a content item's location pins. A content item may
 * have zero, one or several — most have none, some (like the main monument) have one.
 * A saved pin appears on the public map the next time it loads; nothing else needs to
 * change for that to happen.
 */
export function LocationPanel({ content }: { content: Content }) {
  const queryClient = useQueryClient();
  const queryKey = ["locations", content.id];

  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<LocationInput>(emptyForm);
  const [hasPicked, setHasPicked] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LocationDetail | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; message: string } | null>(
    null,
  );

  const locationsQuery = useQuery({
    queryKey,
    queryFn: () => getLocations(content.id),
  });

  const saveMutation = useMutation({
    mutationFn: (input: LocationInput) =>
      editingId !== null && editingId !== "new"
        ? updateLocation(editingId, input)
        : createLocation({ ...input, contentId: content.id }),
    onSuccess: () => {
      setFeedback({ tone: "success", message: "Ligging is gestoor." });
      void queryClient.invalidateQueries({ queryKey });
      closeForm();
    },
    onError: (error) =>
      setFeedback({ tone: "danger", message: getSafeUserMessageFromUnknownError(error) }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteLocation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setDeleteTarget(null);
    },
    onError: (error) => {
      setFeedback({ tone: "danger", message: getSafeUserMessageFromUnknownError(error) });
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setEditingId("new");
    setForm(emptyForm);
    setHasPicked(false);
    setFeedback(null);
  };

  const openEdit = (location: LocationDetail) => {
    setEditingId(location.id);
    setForm({
      latitude: location.latitude,
      longitude: location.longitude,
      label: location.label,
      addressLine: location.addressLine,
      notes: location.notes,
    });
    setHasPicked(true);
    setFeedback(null);
  };

  const closeForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setHasPicked(false);
  };

  if (locationsQuery.isLoading) {
    return <Spinner />;
  }

  const locations = locationsQuery.data ?? [];
  const isRangeValid = form.latitude >= -90 && form.latitude <= 90 && form.longitude >= -180 && form.longitude <= 180;
  const canSave = hasPicked && isRangeValid;

  return (
    <div className="flex flex-col gap-4">
      {feedback && <Alert tone={feedback.tone}>{feedback.message}</Alert>}

      <div>
        <h3 className="mb-2 text-sm font-medium text-(--text-primary)">Bestaande liggings</h3>
        {locations.length === 0 ? (
          <p className="text-sm text-(--text-secondary)">Nog geen ligging vir hierdie inhoud nie.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {locations.map((location) => (
              <li
                key={location.id}
                className="flex items-center justify-between gap-3 rounded-md border border-(--panel-border) px-3 py-2 text-sm"
              >
                <span className="text-(--text-secondary)">
                  <span className="font-medium text-(--text-primary)">
                    {location.label ?? "Ligging"}
                  </span>
                  {" — "}
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </span>
                <span className="flex shrink-0 gap-1">
                  <Button variant="ghost" onClick={() => openEdit(location)}>
                    Wysig
                  </Button>
                  <Button variant="ghost" onClick={() => setDeleteTarget(location)}>
                    Verwyder
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editingId === null ? (
        <div>
          <Button onClick={openCreate}>Voeg ligging by</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-md border border-(--panel-border) p-4">
          <p className="text-xs text-(--text-secondary)">
            Klik op die kaart om die punt te stel, of tik die koördinate direk in.
          </p>

          <LocationMapPicker
            latitude={hasPicked ? form.latitude : null}
            longitude={hasPicked ? form.longitude : null}
            onPick={(latitude, longitude) => {
              setForm({ ...form, latitude, longitude });
              setHasPicked(true);
            }}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Breedtegraad"
              htmlFor="latitude"
              error={hasPicked && !isRangeValid ? "Moet tussen -90 en 90 wees." : undefined}
            >
              <Input
                id="latitude"
                type="number"
                step="0.000001"
                min={-90}
                max={90}
                value={hasPicked ? form.latitude : ""}
                onChange={(event) => {
                  setForm({ ...form, latitude: Number(event.target.value) });
                  setHasPicked(true);
                }}
              />
            </Field>
            <Field
              label="Lengtegraad"
              htmlFor="longitude"
              error={hasPicked && !isRangeValid ? "Moet tussen -180 en 180 wees." : undefined}
            >
              <Input
                id="longitude"
                type="number"
                step="0.000001"
                min={-180}
                max={180}
                value={hasPicked ? form.longitude : ""}
                onChange={(event) => {
                  setForm({ ...form, longitude: Number(event.target.value) });
                  setHasPicked(true);
                }}
              />
            </Field>
          </div>

          <Field label="Etiket" htmlFor="label" hint="Opsioneel, bv. 'Hoofingang'.">
            <Input
              id="label"
              value={form.label ?? ""}
              maxLength={200}
              onChange={(event) => setForm({ ...form, label: event.target.value || null })}
            />
          </Field>

          <Field label="Adres" htmlFor="addressLine" hint="Opsioneel, vir vertoon aan besoekers.">
            <Input
              id="addressLine"
              value={form.addressLine ?? ""}
              maxLength={500}
              onChange={(event) => setForm({ ...form, addressLine: event.target.value || null })}
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={closeForm}>
              Kanselleer
            </Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={!canSave || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Stoor tans..." : "Stoor ligging"}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Verwyder ligging"
        message={`Verwyder "${deleteTarget?.label ?? "hierdie ligging"}"?`}
        confirmLabel="Verwyder"
        isBusy={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}
