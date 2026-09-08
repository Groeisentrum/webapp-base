"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Field, Select, Spinner, Textarea } from "@/shared/components/ui";
import { ENTITY_TYPES, TRANSLATABLE_FIELDS, type Content } from "@/shared/interfaces/Domain";
import { getSafeUserMessageFromUnknownError } from "@/shared/lib/apiError";
import { getTenantSettings } from "@/shared/services/adminService";
import { getTranslations, upsertTranslation } from "@/shared/services/contentService";

const FIELD_LABELS: Record<string, string> = {
  [TRANSLATABLE_FIELDS.title]: "Titel",
  [TRANSLATABLE_FIELDS.description]: "Beskrywing",
  [TRANSLATABLE_FIELDS.body]: "Teks",
};

/**
 * Edits one field of one content item in one language at a time.
 *
 * Only languages the deployment has activated are offered — the API rejects the rest,
 * so offering them would only produce errors.
 */
export function TranslationsPanel({ content }: { content: Content }) {
  const queryClient = useQueryClient();
  const [languageCode, setLanguageCode] = useState<string>("");
  const [fieldName, setFieldName] = useState<string>(TRANSLATABLE_FIELDS.title);
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; message: string } | null>(
    null,
  );

  const settingsQuery = useQuery({
    queryKey: ["tenant-settings"],
    queryFn: getTenantSettings,
    retry: false,
  });

  const translationsQuery = useQuery({
    queryKey: ["translations", ENTITY_TYPES.content, content.id],
    queryFn: () => getTranslations(ENTITY_TYPES.content, content.id),
  });

  const saveMutation = useMutation({
    mutationFn: upsertTranslation,
    onSuccess: () => {
      setFeedback({ tone: "success", message: "Vertaling is gestoor." });
      void queryClient.invalidateQueries({
        queryKey: ["translations", ENTITY_TYPES.content, content.id],
      });
    },
    onError: (error) =>
      setFeedback({ tone: "danger", message: getSafeUserMessageFromUnknownError(error) }),
  });

  if (settingsQuery.isLoading || translationsQuery.isLoading) {
    return <Spinner />;
  }

  const settings = settingsQuery.data;
  const translations = translationsQuery.data ?? [];

  // Content editors cannot read tenant settings, so the language list may be absent.
  const availableLanguages = (settings?.activeLanguageCodes ?? []).filter(
    (code) => code !== settings?.defaultLanguageCode,
  );

  if (availableLanguages.length === 0) {
    return (
      <Alert tone="warning">
        Geen bykomende tale is vir hierdie werf geaktiveer nie. &apos;n Administrateur kan
        tale by die werfinstellings byvoeg.
      </Alert>
    );
  }

  const selectedLanguage = languageCode || availableLanguages[0];

  const handleSave = () => {
    setFeedback(null);
    saveMutation.mutate({
      entityType: ENTITY_TYPES.content,
      entityId: content.id,
      fieldName,
      languageCode: selectedLanguage,
      value,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {feedback && <Alert tone={feedback.tone}>{feedback.message}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Taal" htmlFor="languageCode">
          <Select
            id="languageCode"
            value={selectedLanguage}
            onChange={(event) => setLanguageCode(event.target.value)}
          >
            {availableLanguages.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Veld" htmlFor="fieldName">
          <Select
            id="fieldName"
            value={fieldName}
            onChange={(event) => setFieldName(event.target.value)}
          >
            {Object.entries(FIELD_LABELS).map(([field, label]) => (
              <option key={field} value={field}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Vertaalde waarde" htmlFor="translationValue">
        <Textarea
          id="translationValue"
          rows={4}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </Field>

      <div>
        <Button onClick={handleSave} disabled={saveMutation.isPending || value.trim().length === 0}>
          {saveMutation.isPending ? "Stoor tans..." : "Stoor vertaling"}
        </Button>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-(--text-primary)">Bestaande vertalings</h3>
        {translations.length === 0 ? (
          <p className="text-sm text-(--text-secondary)">Nog geen vertalings nie.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {translations.map((translation) => (
              <li key={translation.id} className="text-(--text-secondary)">
                <span className="font-medium text-(--text-primary)">
                  {translation.languageCode} · {FIELD_LABELS[translation.fieldName] ?? translation.fieldName}
                </span>
                {" — "}
                {translation.value}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
