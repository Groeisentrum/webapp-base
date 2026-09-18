"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Field, Input, Spinner } from "@/shared/components/ui";
import { ConfirmDialog, Modal } from "@/shared/components/Modal";
import type { PublicLocation } from "@/shared/interfaces/Domain";
import { getSafeUserMessageFromUnknownError } from "@/shared/lib/apiError";
import {
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

/**
 * Opened from a pin's "Wysig ligging" popup action. `pin` comes from the public
 * locations feed, which doesn't carry `label`/`notes` (those are admin-only), so this
 * fetches the full `LocationDetail` for the pin's content item before showing the
 * form — the same data source `LocationPanel` uses, just entered from the map
 * instead of from the content item.
 */
export function LocationEditModal({
  pin,
  onClose,
}: {
  pin: PublicLocation | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<{ pinId: number; input: LocationInput } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; message: string } | null>(
    null,
  );

  const locationsQuery = useQuery({
    queryKey: ["locations", pin?.contentId],
    queryFn: () => getLocations(pin!.contentId),
    enabled: pin !== null,
  });

  const match = pin ? locationsQuery.data?.find((location) => location.id === pin.id) : undefined;

  // "Adjusting state when a prop changes" (react.dev) rather than an effect: this
  // only fires once per newly-opened pin, when the matching LocationDetail has
  // arrived from the query, and is a no-op on every render after that.
  if (match && formState?.pinId !== match.id) {
    setFormState({
      pinId: match.id,
      input: {
        latitude: match.latitude,
        longitude: match.longitude,
        label: match.label,
        addressLine: match.addressLine,
        notes: match.notes,
      },
    });
    if (feedback !== null) setFeedback(null);
  } else if (!pin && formState !== null) {
    setFormState(null);
  }

  const form = formState?.input ?? null;
  const setForm = (input: LocationInput) => {
    if (formState) setFormState({ ...formState, input });
  };

  const saveMutation = useMutation({
    mutationFn: (input: LocationInput) => updateLocation(pin!.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["public-locations"] });
      void queryClient.invalidateQueries({ queryKey: ["locations", pin?.contentId] });
      onClose();
    },
    onError: (error) =>
      setFeedback({ tone: "danger", message: getSafeUserMessageFromUnknownError(error) }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLocation(pin!.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["public-locations"] });
      void queryClient.invalidateQueries({ queryKey: ["locations", pin?.contentId] });
      setConfirmingDelete(false);
      onClose();
    },
    onError: (error) => {
      setFeedback({ tone: "danger", message: getSafeUserMessageFromUnknownError(error) });
      setConfirmingDelete(false);
    },
  });

  const isRangeValid = form
    ? form.latitude >= -90 && form.latitude <= 90 && form.longitude >= -180 && form.longitude <= 180
    : false;

  return (
    <>
      <Modal
        isOpen={pin !== null}
        title={`Wysig ligging — ${pin?.name ?? ""}`}
        onClose={onClose}
        footer={
          pin &&
          form && (
            <>
              <Button
                variant="danger"
                onClick={() => setConfirmingDelete(true)}
                disabled={deleteMutation.isPending}
              >
                Verwyder
              </Button>
              <Button
                onClick={() => saveMutation.mutate(form)}
                disabled={!isRangeValid || saveMutation.isPending}
              >
                {saveMutation.isPending ? "Stoor tans..." : "Stoor"}
              </Button>
            </>
          )
        }
      >
        {feedback && <Alert tone={feedback.tone}>{feedback.message}</Alert>}

        {!pin || locationsQuery.isLoading || !form ? (
          <Spinner />
        ) : (
          <div className="flex flex-col gap-4">
            <LocationMapPicker
              latitude={form.latitude}
              longitude={form.longitude}
              onPick={(latitude, longitude) => setForm({ ...form, latitude, longitude })}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Breedtegraad"
                htmlFor="edit-latitude"
                error={!isRangeValid ? "Moet tussen -90 en 90 wees." : undefined}
              >
                <Input
                  id="edit-latitude"
                  type="number"
                  step="0.000001"
                  min={-90}
                  max={90}
                  value={form.latitude}
                  onChange={(event) => setForm({ ...form, latitude: Number(event.target.value) })}
                />
              </Field>
              <Field
                label="Lengtegraad"
                htmlFor="edit-longitude"
                error={!isRangeValid ? "Moet tussen -180 en 180 wees." : undefined}
              >
                <Input
                  id="edit-longitude"
                  type="number"
                  step="0.000001"
                  min={-180}
                  max={180}
                  value={form.longitude}
                  onChange={(event) => setForm({ ...form, longitude: Number(event.target.value) })}
                />
              </Field>
            </div>

            <Field label="Etiket" htmlFor="edit-label">
              <Input
                id="edit-label"
                value={form.label ?? ""}
                maxLength={200}
                onChange={(event) => setForm({ ...form, label: event.target.value || null })}
              />
            </Field>

            <Field label="Adres" htmlFor="edit-addressLine">
              <Input
                id="edit-addressLine"
                value={form.addressLine ?? ""}
                maxLength={500}
                onChange={(event) => setForm({ ...form, addressLine: event.target.value || null })}
              />
            </Field>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmingDelete}
        title="Verwyder ligging"
        message={`Verwyder "${pin?.name ?? "hierdie ligging"}"?`}
        confirmLabel="Verwyder"
        isBusy={deleteMutation.isPending}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </>
  );
}
