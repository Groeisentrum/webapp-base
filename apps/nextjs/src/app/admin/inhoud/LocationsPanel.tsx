"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Field, Input, Spinner, Textarea } from "@/shared/components/ui";
import type { Content, LocationDetail } from "@/shared/interfaces/Domain";
import { getSafeUserMessageFromUnknownError } from "@/shared/lib/apiError";
import {
  createLocation,
  deleteLocation,
  getLocations,
  updateLocation,
  type LocationInput,
} from "@/shared/services/contentService";

interface LocationsPanelProps {
  content: Content;
}

const emptyForm = {
  latitude: "",
  longitude: "",
  label: "",
  addressLine: "",
  notes: "",
};

const VTM_DEFAULT_LAT = -25.7766;
const VTM_DEFAULT_LNG = 28.1753;

export function LocationsPanel({ content }: LocationsPanelProps) {
  const queryClient = useQueryClient();
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; message: string } | null>(
    null,
  );

  const locationsQuery = useQuery({
    queryKey: ["locations", content.id],
    queryFn: () => getLocations(content.id),
  });

  const saveMutation = useMutation({
    mutationFn: async (input: LocationInput) => {
      if (editingLocationId) {
        return updateLocation(editingLocationId, input);
      }
      return createLocation({ ...input, contentId: content.id });
    },
    onSuccess: () => {
      setFeedback({
        tone: "success",
        message: editingLocationId ? "Ligging is opgedateer." : "Nuwe ligging is bygevoeg.",
      });
      void queryClient.invalidateQueries({ queryKey: ["locations", content.id] });
      resetForm();
    },
    onError: (error) =>
      setFeedback({ tone: "danger", message: getSafeUserMessageFromUnknownError(error) }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteLocation(id),
    onSuccess: () => {
      setFeedback({ tone: "success", message: "Ligging is verwyder." });
      void queryClient.invalidateQueries({ queryKey: ["locations", content.id] });
      if (editingLocationId) resetForm();
    },
    onError: (error) =>
      setFeedback({ tone: "danger", message: getSafeUserMessageFromUnknownError(error) }),
  });

  const resetForm = () => {
    setEditingLocationId(null);
    setForm(emptyForm);
  };

  const handleEdit = (loc: LocationDetail) => {
    setEditingLocationId(loc.id);
    setForm({
      latitude: loc.latitude.toString(),
      longitude: loc.longitude.toString(),
      label: loc.label ?? "",
      addressLine: loc.addressLine ?? "",
      notes: loc.notes ?? "",
    });
    setFeedback(null);
  };

  const handleSetVtmDefaults = () => {
    setForm((prev) => ({
      ...prev,
      latitude: VTM_DEFAULT_LAT.toString(),
      longitude: VTM_DEFAULT_LNG.toString(),
    }));
  };

  const handleUseCurrentPosition = () => {
    if (!navigator.geolocation) {
      setFeedback({ tone: "danger", message: "Geoligging word nie deur jou blaaier ondersteun nie." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setFeedback({ tone: "success", message: "Huidige GPS-koördinate verkry." });
      },
      () => {
        setFeedback({ tone: "danger", message: "Kon nie huidige GPS-koördinate verkry nie." });
      },
      { enableHighAccuracy: true },
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const lat = Number.parseFloat(form.latitude);
    const lng = Number.parseFloat(form.longitude);

    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      setFeedback({ tone: "danger", message: "Breedtegraad moet tussen -90 en 90 wees." });
      return;
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      setFeedback({ tone: "danger", message: "Lengtegraad moet tussen -180 en 180 wees." });
      return;
    }

    saveMutation.mutate({
      latitude: lat,
      longitude: lng,
      label: form.label.trim() || null,
      addressLine: form.addressLine.trim() || null,
      notes: form.notes.trim() || null,
    });
  };

  if (locationsQuery.isLoading) {
    return <Spinner />;
  }

  const locations = locationsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-5">
      {feedback && <Alert tone={feedback.tone}>{feedback.message}</Alert>}

      <div>
        <h3 className="mb-2 text-sm font-medium text-(--text-primary)">
          Bestaande kaartpenne ({locations.length})
        </h3>
        {locations.length === 0 ? (
          <p className="text-sm text-(--text-secondary)">
            Hierdie item het nog geen geografiese penne op die kaart nie.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="flex items-center justify-between rounded-lg border border-(--panel-border) bg-(--page-bg) p-3"
              >
                <div className="flex flex-col text-sm">
                  <span className="font-semibold text-(--text-primary)">
                    {loc.label || "Onbenoemde pen"}
                  </span>
                  <span className="font-mono text-xs text-(--text-secondary)">
                    {loc.latitude}, {loc.longitude}
                  </span>
                  {loc.addressLine && (
                    <span className="text-xs text-(--text-secondary)">{loc.addressLine}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mr-2 text-xs text-(--brand-primary) underline"
                  >
                    Kaart
                  </a>
                  <Button variant="ghost" onClick={() => handleEdit(loc)}>
                    Wysig
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(loc.id)}
                    disabled={deleteMutation.isPending}
                  >
                    Verwyder
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-(--panel-border) p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-(--text-primary)">
            {editingLocationId ? "Wysig liggingpen" : "Voeg nuwe liggingpen by"}
          </h4>
          {editingLocationId && (
            <Button variant="ghost" onClick={resetForm}>
              Kanselleer
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Breedtegraad (Latitude)" htmlFor="lat">
            <Input
              id="lat"
              type="number"
              step="any"
              placeholder="-25.776600"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              required
            />
          </Field>
          <Field label="Lengtegraad (Longitude)" htmlFor="lng">
            <Input
              id="lng"
              type="number"
              step="any"
              placeholder="28.175300"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              required
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleSetVtmDefaults}>
            📍 VTM Sentrum
          </Button>
          <Button variant="secondary" onClick={handleUseCurrentPosition}>
            🎯 Huidige GPS
          </Button>
        </div>

        <Field label="Etiket / Naam van pen" htmlFor="label">
          <Input
            id="label"
            placeholder="bv. Hoofmonument of Heldesaal"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
        </Field>

        <Field label="Adres / Beskrywing van plek" htmlFor="addressLine">
          <Input
            id="addressLine"
            placeholder="bv. Eeufeesweg, Groenkloof, Pretoria"
            value={form.addressLine}
            onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
          />
        </Field>

        <Field label="Notas vir gidse / interne notas" htmlFor="notes">
          <Textarea
            id="notes"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>

        <div>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending
              ? "Stoor tans..."
              : editingLocationId
                ? "Stoor wysiging"
                : "Voeg ligging by"}
          </Button>
        </div>
      </form>
    </div>
  );
}