"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Field, Input, Panel, Spinner } from "@/shared/components/ui";
import { FEATURE_FLAGS, type TenantSettings } from "@/shared/interfaces/Domain";
import { getSafeUserMessageFromUnknownError } from "@/shared/lib/apiError";
import {
  getTenantSettings,
  updateTenantSettings,
  type TenantSettingsInput,
} from "@/shared/services/adminService";

const FEATURE_FLAG_LABELS: Record<string, string> = {
  [FEATURE_FLAGS.augmentedReality]: "Verhoogde realiteit (AR)",
  [FEATURE_FLAGS.virtualTour]: "Virtuele toer",
  [FEATURE_FLAGS.nfc]: "NFC",
  [FEATURE_FLAGS.chatbot]: "Klantediens-bot",
};

const emptyForm: TenantSettingsInput = {
  siteName: "",
  defaultLanguageCode: "af",
  activeLanguageCodes: ["af"],
  featureFlags: {},
  branding: {},
  contactInfo: {},
};

function toFormValues(settings: TenantSettings | undefined): TenantSettingsInput {
  if (!settings) {
    return emptyForm;
  }

  return {
    siteName: settings.siteName,
    defaultLanguageCode: settings.defaultLanguageCode,
    activeLanguageCodes: settings.activeLanguageCodes,
    featureFlags: settings.featureFlags,
    branding: settings.branding,
    contactInfo: settings.contactInfo,
  };
}

export default function TenantSettingsPage() {
  const settingsQuery = useQuery({
    queryKey: ["tenant-settings"],
    queryFn: getTenantSettings,
    retry: false,
  });

  if (settingsQuery.isLoading) {
    return <Spinner />;
  }

  // Remount the form when the saved settings change so its fields re-initialise from
  // the new data, rather than syncing props into state through an effect.
  const settings = settingsQuery.data;
  const formKey = settings ? `${settings.id}-${settings.updatedAt ?? settings.createdAt}` : "new";

  return (
    <TenantSettingsForm
      key={formKey}
      settings={settings}
      isNotConfigured={settingsQuery.isError}
    />
  );
}

function TenantSettingsForm({
  settings,
  isNotConfigured,
}: {
  settings: TenantSettings | undefined;
  isNotConfigured: boolean;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TenantSettingsInput>(() => toFormValues(settings));
  const [languagesText, setLanguagesText] = useState(() =>
    (settings?.activeLanguageCodes ?? ["af"]).join(", "),
  );
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; message: string } | null>(
    null,
  );

  const saveMutation = useMutation({
    mutationFn: updateTenantSettings,
    onSuccess: () => {
      setFeedback({ tone: "success", message: "Instellings is gestoor." });
      void queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
    },
    onError: (error) => {
      setFeedback({ tone: "danger", message: getSafeUserMessageFromUnknownError(error) });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    const activeLanguageCodes = languagesText
      .split(",")
      .map((code) => code.trim())
      .filter((code) => code.length > 0);

    saveMutation.mutate({ ...form, activeLanguageCodes });
  };

  const toggleFlag = (flagName: string, enabled: boolean) => {
    setForm((current) => ({
      ...current,
      featureFlags: { ...current.featureFlags, [flagName]: enabled },
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-xl font-semibold text-(--text-primary)">Werfinstellings</h1>

      {feedback && <Alert tone={feedback.tone}>{feedback.message}</Alert>}
      {isNotConfigured && (
        <Alert tone="warning">
          Die werf is nog nie opgestel nie. Vul die vorm in om dit te skep.
        </Alert>
      )}

      <Panel title="Algemeen">
        <div className="flex flex-col gap-4">
          <Field label="Werfnaam" htmlFor="siteName">
            <Input
              id="siteName"
              value={form.siteName}
              onChange={(event) => setForm({ ...form, siteName: event.target.value })}
              required
            />
          </Field>

          <Field
            label="Aktiewe tale"
            htmlFor="languages"
            hint="Taalkodes geskei deur kommas, byvoorbeeld: af, en, zu"
          >
            <Input
              id="languages"
              value={languagesText}
              onChange={(event) => setLanguagesText(event.target.value)}
              required
            />
          </Field>

          <Field
            label="Verstektaal"
            htmlFor="defaultLanguage"
            hint="Moet een van die aktiewe tale wees. Inhoud val hierop terug wanneer 'n vertaling ontbreek."
          >
            <Input
              id="defaultLanguage"
              value={form.defaultLanguageCode}
              onChange={(event) => setForm({ ...form, defaultLanguageCode: event.target.value })}
              required
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Funksies" description="Skakel modules onafhanklik aan of af.">
        <div className="flex flex-col gap-2">
          {Object.entries(FEATURE_FLAG_LABELS).map(([flagName, label]) => (
            <label key={flagName} className="flex items-center gap-2 text-sm text-(--text-primary)">
              <input
                type="checkbox"
                checked={form.featureFlags[flagName] ?? false}
                onChange={(event) => toggleFlag(flagName, event.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
      </Panel>

      <Panel title="Handelsmerk">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Primêre kleur" htmlFor="primaryColour">
            <Input
              id="primaryColour"
              value={form.branding.primaryColour ?? ""}
              onChange={(event) =>
                setForm({ ...form, branding: { ...form.branding, primaryColour: event.target.value } })
              }
              placeholder="#1f5f4b"
            />
          </Field>
          <Field label="Sekondêre kleur" htmlFor="secondaryColour">
            <Input
              id="secondaryColour"
              value={form.branding.secondaryColour ?? ""}
              onChange={(event) =>
                setForm({
                  ...form,
                  branding: { ...form.branding, secondaryColour: event.target.value },
                })
              }
            />
          </Field>
          <Field label="Aksentkleur" htmlFor="accentColour">
            <Input
              id="accentColour"
              value={form.branding.accentColour ?? ""}
              onChange={(event) =>
                setForm({ ...form, branding: { ...form.branding, accentColour: event.target.value } })
              }
            />
          </Field>
          <Field label="Logo-verwysing" htmlFor="logoReference">
            <Input
              id="logoReference"
              value={form.branding.logoReference ?? ""}
              onChange={(event) =>
                setForm({ ...form, branding: { ...form.branding, logoReference: event.target.value } })
              }
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Kontakbesonderhede">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="E-pos" htmlFor="emailAddress">
            <Input
              id="emailAddress"
              type="email"
              value={form.contactInfo.emailAddress ?? ""}
              onChange={(event) =>
                setForm({
                  ...form,
                  contactInfo: { ...form.contactInfo, emailAddress: event.target.value },
                })
              }
            />
          </Field>
          <Field label="Telefoon" htmlFor="phoneNumber">
            <Input
              id="phoneNumber"
              value={form.contactInfo.phoneNumber ?? ""}
              onChange={(event) =>
                setForm({
                  ...form,
                  contactInfo: { ...form.contactInfo, phoneNumber: event.target.value },
                })
              }
            />
          </Field>
          <Field label="Fisiese adres" htmlFor="physicalAddress">
            <Input
              id="physicalAddress"
              value={form.contactInfo.physicalAddress ?? ""}
              onChange={(event) =>
                setForm({
                  ...form,
                  contactInfo: { ...form.contactInfo, physicalAddress: event.target.value },
                })
              }
            />
          </Field>
          <Field label="Posadres" htmlFor="postalAddress">
            <Input
              id="postalAddress"
              value={form.contactInfo.postalAddress ?? ""}
              onChange={(event) =>
                setForm({
                  ...form,
                  contactInfo: { ...form.contactInfo, postalAddress: event.target.value },
                })
              }
            />
          </Field>
        </div>
      </Panel>

      <div>
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Stoor tans..." : "Stoor instellings"}
        </Button>
      </div>
    </form>
  );
}
