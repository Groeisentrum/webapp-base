"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Field, Input, Select, Spinner, Textarea } from "@/shared/components/ui";
import { ENTITY_TYPES, TRANSLATABLE_FIELDS, type Content } from "@/shared/interfaces/Domain";
import { getSafeUserMessageFromUnknownError } from "@/shared/lib/apiError";
import { getTenantSettings } from "@/shared/services/adminService";
import { deleteTranslation, getTranslations, upsertTranslation } from "@/shared/services/contentService";
import { RichTextEditor } from "@/shared/components/RichTextEditor";

interface TranslationsPanelProps {
  content: Content;
}

interface TranslationFormProps {
  content: Content;
  activeLang: string;
  initialTitle: string;
  initialDescription: string;
  initialBody: string;
  existingDescId?: number;
  existingBodyId?: number;
  onSuccess: () => void;
  onError: (error: unknown) => void;
}

function TranslationForm({
  content,
  activeLang,
  initialTitle,
  initialDescription,
  initialBody,
  existingDescId,
  existingBodyId,
  onSuccess,
  onError,
}: TranslationFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [body, setBody] = useState(initialBody);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises: Promise<unknown>[] = [
        // Titel is verpligtend vir die vertaling
        upsertTranslation({
          entityType: ENTITY_TYPES.content,
          entityId: content.id,
          fieldName: TRANSLATABLE_FIELDS.title,
          languageCode: activeLang,
          value: title.trim(),
        }),
      ];

      // Hanteer Beskrywing:
      if (isBlank(description)) {
        if (existingDescId) {
          promises.push(deleteTranslation(existingDescId));
        }
      } else {
        promises.push(
          upsertTranslation({
            entityType: ENTITY_TYPES.content,
            entityId: content.id,
            fieldName: TRANSLATABLE_FIELDS.description,
            languageCode: activeLang,
            value: description.trim(),
          }),
        );
      }

      // Hanteer Hoofteks / Artikelinhoud:
      if (isBlank(body)) {
        if (existingBodyId) {
          promises.push(deleteTranslation(existingBodyId));
        }
      } else {
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
    onSuccess,
    onError,
  });

  return (
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
  );
}

function isBlank(value: string | null | undefined): boolean {
  if (!value) return true;
  const stripped = value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
  return stripped.length === 0;
}

export function TranslationsPanel({ content }: TranslationsPanelProps) {
  const queryClient = useQueryClient();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
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

  if (settingsQuery.isLoading || translationsQuery.isLoading) {
    return <Spinner />;
  }

  if (settingsQuery.isError || translationsQuery.isError) {
    return (
      <Alert tone="danger">
        Kon nie die vertalings of taalinstellings laai nie. Verfris asseblief die bladsy.
      </Alert>
    );
  }

  if (availableLanguages.length === 0) {
    return (
      <Alert tone="warning">
        Geen bykomende tale is tans vir hierdie webtuiste geaktiveer nie. &apos;n Administrateur kan
        tale aktiveer onder Werfinstellings (bv. &quot;en&quot; vir Engels).
      </Alert>
    );
  }

  const trans = (translationsQuery.data ?? []).filter((t) => t.languageCode === activeLang);
  const titleTrans = trans.find((t) => t.fieldName === TRANSLATABLE_FIELDS.title);
  const descTrans = trans.find((t) => t.fieldName === TRANSLATABLE_FIELDS.description);
  const bodyTrans = trans.find((t) => t.fieldName === TRANSLATABLE_FIELDS.body);

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

      <TranslationForm
        key={`${content.id}-${activeLang}-${translationsQuery.dataUpdatedAt}`}
        content={content}
        activeLang={activeLang}
        initialTitle={titleTrans?.value ?? ""}
        initialDescription={descTrans?.value ?? ""}
        initialBody={bodyTrans?.value ?? ""}
        existingDescId={descTrans?.id}
        existingBodyId={bodyTrans?.id}
        onSuccess={() => {
          setFeedback({ tone: "success", message: `Vertalings vir (${activeLang}) is gestoor.` });
          void queryClient.invalidateQueries({
            queryKey: ["translations", ENTITY_TYPES.content, content.id],
          });
        }}
        onError={(error) => {
          setFeedback({ tone: "danger", message: getSafeUserMessageFromUnknownError(error) });
        }}
      />
    </div>
  );
}
