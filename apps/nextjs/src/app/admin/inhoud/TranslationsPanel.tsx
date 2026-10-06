"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Field, Input, Select, Spinner, Textarea } from "@/shared/components/ui";
import { ENTITY_TYPES, TRANSLATABLE_FIELDS, type Content } from "@/shared/interfaces/Domain";
import { getSafeUserMessageFromUnknownError } from "@/shared/lib/apiError";
import { getTenantSettings } from "@/shared/services/adminService";
import { getTranslations, upsertTranslation } from "@/shared/services/contentService";
import { RichTextEditor } from "@/shared/components/RichTextEditor";

interface TranslationsPanelProps {
  content: Content;
}

export function TranslationsPanel({ content }: TranslationsPanelProps) {
  const queryClient = useQueryClient();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
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

  const availableLanguages = (settingsQuery.data?.activeLanguageCodes ?? []).filter(
    (code) => code !== settingsQuery.data?.defaultLanguageCode,
  );

  const activeLang = selectedLanguage || availableLanguages[0] || "en";

  // When active language or translations data changes, populate form values
  useEffect(() => {
    if (!translationsQuery.data) return;
    const trans = translationsQuery.data.filter((t) => t.languageCode === activeLang);
    const tTitle = trans.find((t) => t.fieldName === TRANSLATABLE_FIELDS.title)?.value ?? "";
    const tDesc = trans.find((t) => t.fieldName === TRANSLATABLE_FIELDS.description)?.value ?? "";
    const tBody = trans.find((t) => t.fieldName === TRANSLATABLE_FIELDS.body)?.value ?? "";

    setTitle(tTitle);
    setDescription(tDesc);
    setBody(tBody);
  }, [activeLang, translationsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises = [
        upsertTranslation({
          entityType: ENTITY_TYPES.content,
          entityId: content.id,
          fieldName: TRANSLATABLE_FIELDS.title,
          languageCode: activeLang,
          value: title,
        }),
      ];

      if (description) {
        promises.push(
          upsertTranslation({
            entityType: ENTITY_TYPES.content,
            entityId: content.id,
            fieldName: TRANSLATABLE_FIELDS.description,
            languageCode: activeLang,
            value: description,
          }),
        );
      }

      if (body) {
        promises.push(
          upsertTranslation({
            entityType: ENTITY_TYPES.content,
            entityId: content.id,
            fieldName: TRANSLATABLE_FIELDS.body,
            languageCode: activeLang,
            value: body,
          }),
        );
      }

      await Promise.all(promises);
    },
    onSuccess: () => {
      setFeedback({ tone: "success", message: `Vertalings vir (${activeLang}) is gestoor.` });
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

  if (availableLanguages.length === 0) {
    return (
      <Alert tone="warning">
        Geen bykomende tale is tans vir hierdie webtuiste geaktiveer nie. &apos;n Administrateur kan
        tale aktiveer onder Werfinstellings (bv. &quot;en&quot; vir Engels).
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {feedback && <Alert tone={feedback.tone}>{feedback.message}</Alert>}

      <div className="flex items-center gap-3">
        <label htmlFor="targetLanguage" className="text-sm font-medium text-(--text-primary)">
          Teikentaal vir vertaling:
        </label>
        <Select
          id="targetLanguage"
          className="w-48"
          value={activeLang}
          onChange={(e) => {
            setSelectedLanguage(e.target.value);
            setFeedback(null);
          }}
        >
          {availableLanguages.map((code) => (
            <option key={code} value={code}>
              {code.toUpperCase()}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-4">
        {/* Title */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-(--text-secondary)">
            Oorspronklike titel: <strong>{content.title}</strong>
          </span>
          <Field label={`Vertaalde Titel (${activeLang})`} htmlFor="transTitle">
            <Input
              id="transTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Vertaal titel..."
            />
          </Field>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1">
          {content.description && (
            <span className="text-xs text-(--text-secondary)">
              Oorspronklike beskrywing: <em>{content.description}</em>
            </span>
          )}
          <Field label={`Vertaalde Beskrywing (${activeLang})`} htmlFor="transDesc">
            <Textarea
              id="transDesc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Vertaal kort beskrywing..."
            />
          </Field>
        </div>

        {/* Body (Rich Text) */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-(--text-primary)">
            Vertaalde Artikelinhoud ({activeLang})
          </label>
          <RichTextEditor
            value={body}
            onChange={(html) => setBody(html)}
            placeholder="Tik vertaalde artikelinhoud hier..."
          />
        </div>

        <div>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !title.trim()}
          >
            {saveMutation.isPending ? "Stoor tans..." : `Stoor ${activeLang.toUpperCase()} Vertalings`}
          </Button>
        </div>
      </div>
    </div>
  );
}