"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  EmptyState,
  Field,
  Input,
  Panel,
  Select,
  Spinner,
  Textarea,
} from "@/shared/components/ui";
import { ConfirmDialog, Modal } from "@/shared/components/Modal";
import {
  AssetType,
  RecurrenceFrequency,
  WeekOfMonth,
  type Content,
} from "@/shared/interfaces/Domain";
import { getSafeUserMessageFromUnknownError } from "@/shared/lib/apiError";
import { formatDateTime, fromDateTimeLocal, toDateTimeLocal } from "@/shared/lib/dateFields";
import { getCategories } from "@/shared/services/adminService";
import {
  createContent,
  deleteContent,
  getContent,
  updateContent,
  type ContentInput,
} from "@/shared/services/contentService";
import { TranslationsPanel } from "./TranslationsPanel";

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  [AssetType.None]: "Geen",
  [AssetType.YouTube]: "YouTube",
  [AssetType.S3]: "S3",
  [AssetType.SelfHosted]: "Self gehuisves",
  [AssetType.ExternalLink]: "Eksterne skakel",
  [AssetType.Image]: "Beeld",
};

const WEEKDAY_LABELS = ["Sondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrydag", "Saterdag"];

const WEEK_OF_MONTH_LABELS: Record<WeekOfMonth, string> = {
  [WeekOfMonth.None]: "—",
  [WeekOfMonth.First]: "Eerste",
  [WeekOfMonth.Second]: "Tweede",
  [WeekOfMonth.Third]: "Derde",
  [WeekOfMonth.Fourth]: "Vierde",
  [WeekOfMonth.Last]: "Laaste",
};

const emptyForm: ContentInput = {
  categoryId: 0,
  title: "",
  description: null,
  body: null,
  assetType: AssetType.None,
  assetReference: null,
  publishedAt: null,
  unpublishedAt: null,
  eventStart: null,
  eventEnd: null,
  recurrence: null,
};

export default function ContentPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Content | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<ContentInput>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Content | null>(null);
  const [translationTarget, setTranslationTarget] = useState<Content | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const contentQuery = useQuery({
    queryKey: ["content", { page: 1, pageSize: 50 }],
    queryFn: () => getContent({ page: 1, pageSize: 50 }),
  });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories });

  const saveMutation = useMutation({
    mutationFn: (input: ContentInput) =>
      editing ? updateContent(editing.id, input) : createContent(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["content"] });
      closeForm();
    },
    onError: (error) => setErrorMessage(getSafeUserMessageFromUnknownError(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteContent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["content"] });
      setDeleteTarget(null);
    },
    onError: (error) => {
      setErrorMessage(getSafeUserMessageFromUnknownError(error));
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    const firstCategoryId = categoriesQuery.data?.[0]?.id ?? 0;
    setEditing(null);
    setForm({ ...emptyForm, categoryId: firstCategoryId });
    setErrorMessage(null);
    setIsFormOpen(true);
  };

  const openEdit = (content: Content) => {
    setEditing(content);
    setForm({
      categoryId: content.categoryId,
      title: content.title,
      description: content.description,
      body: content.body,
      assetType: content.assetType,
      assetReference: content.assetReference,
      publishedAt: content.publishedAt,
      unpublishedAt: content.unpublishedAt,
      eventStart: content.eventStart,
      eventEnd: content.eventEnd,
      recurrence: content.recurrence,
    });
    setErrorMessage(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  if (contentQuery.isLoading) {
    return <Spinner />;
  }

  const items = contentQuery.data?.items ?? [];
  const categories = categoriesQuery.data ?? [];
  const recurrence = form.recurrence ?? {
    frequency: RecurrenceFrequency.None,
    dayOfWeek: null,
    weekOfMonth: null,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-(--text-primary)">Inhoud</h1>
        <Button onClick={openCreate} disabled={categories.length === 0}>
          Nuwe inhoud
        </Button>
      </div>

      {errorMessage && <Alert tone="danger">{errorMessage}</Alert>}
      {categories.length === 0 && (
        <Alert tone="warning">Skep eers &apos;n kategorie voordat jy inhoud byvoeg.</Alert>
      )}

      <Panel>
        {items.length === 0 ? (
          <EmptyState message="Nog geen inhoud nie." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-(--panel-border) text-(--text-secondary)">
              <tr>
                <th className="py-2 pr-4 font-medium">Titel</th>
                <th className="py-2 pr-4 font-medium">Gepubliseer vanaf</th>
                <th className="py-2 pr-4 font-medium">Geleentheid</th>
                <th className="py-2 pr-4 font-medium">Aksies</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-(--panel-border) last:border-0">
                  <td className="py-2 pr-4 text-(--text-primary)">{item.title}</td>
                  <td className="py-2 pr-4 text-(--text-secondary)">
                    {formatDateTime(item.publishedAt)}
                  </td>
                  <td className="py-2 pr-4 text-(--text-secondary)">
                    {formatDateTime(item.eventStart)}
                  </td>
                  <td className="py-2 pr-4">
                    <span className="flex gap-1">
                      <Button variant="ghost" onClick={() => openEdit(item)}>
                        Wysig
                      </Button>
                      <Button variant="ghost" onClick={() => setTranslationTarget(item)}>
                        Vertalings
                      </Button>
                      <Button variant="ghost" onClick={() => setDeleteTarget(item)}>
                        Verwyder
                      </Button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Modal
        isOpen={isFormOpen}
        title={editing ? "Wysig inhoud" : "Nuwe inhoud"}
        onClose={closeForm}
        footer={
          <>
            <Button variant="secondary" onClick={closeForm}>
              Kanselleer
            </Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Stoor tans..." : "Stoor"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4">
            <Field label="Titel" htmlFor="title">
              <Input
                id="title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </Field>

            <Field label="Kategorie" htmlFor="categoryId">
              <Select
                id="categoryId"
                value={form.categoryId}
                onChange={(event) => setForm({ ...form, categoryId: Number(event.target.value) })}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Beskrywing" htmlFor="description">
              <Textarea
                id="description"
                rows={2}
                value={form.description ?? ""}
                onChange={(event) => setForm({ ...form, description: event.target.value || null })}
              />
            </Field>

            <Field label="Teks" htmlFor="body">
              <Textarea
                id="body"
                rows={4}
                value={form.body ?? ""}
                onChange={(event) => setForm({ ...form, body: event.target.value || null })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Mediatipe" htmlFor="assetType">
                <Select
                  id="assetType"
                  value={form.assetType}
                  onChange={(event) =>
                    setForm({ ...form, assetType: Number(event.target.value) as AssetType })
                  }
                >
                  {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Mediaverwysing" htmlFor="assetReference">
                <Input
                  id="assetReference"
                  value={form.assetReference ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, assetReference: event.target.value || null })
                  }
                />
              </Field>
            </div>
          </div>

          <fieldset className="rounded-md border border-(--panel-border) p-4">
            <legend className="px-2 text-sm font-medium text-(--text-primary)">
              Publikasievenster
            </legend>
            <p className="mb-3 text-xs text-(--text-secondary)">
              Bepaal wanneer die inhoud op die werf sigbaar is. Dit is los van die
              geleentheidsdatums hieronder.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Publiseer vanaf" htmlFor="publishedAt">
                <Input
                  id="publishedAt"
                  type="datetime-local"
                  value={toDateTimeLocal(form.publishedAt)}
                  onChange={(event) =>
                    setForm({ ...form, publishedAt: fromDateTimeLocal(event.target.value) })
                  }
                />
              </Field>
              <Field label="Publikasie eindig" htmlFor="unpublishedAt">
                <Input
                  id="unpublishedAt"
                  type="datetime-local"
                  value={toDateTimeLocal(form.unpublishedAt)}
                  onChange={(event) =>
                    setForm({ ...form, unpublishedAt: fromDateTimeLocal(event.target.value) })
                  }
                />
              </Field>
            </div>
          </fieldset>

          <fieldset className="rounded-md border border-(--panel-border) p-4">
            <legend className="px-2 text-sm font-medium text-(--text-primary)">Geleentheid</legend>
            <p className="mb-3 text-xs text-(--text-secondary)">
              Wanneer die geleentheid self plaasvind. &apos;n Verlede geleentheid bly
              sigbaar solank die publikasievenster oop is.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Begin" htmlFor="eventStart">
                <Input
                  id="eventStart"
                  type="datetime-local"
                  value={toDateTimeLocal(form.eventStart)}
                  onChange={(event) =>
                    setForm({ ...form, eventStart: fromDateTimeLocal(event.target.value) })
                  }
                />
              </Field>
              <Field label="Einde" htmlFor="eventEnd">
                <Input
                  id="eventEnd"
                  type="datetime-local"
                  value={toDateTimeLocal(form.eventEnd)}
                  onChange={(event) =>
                    setForm({ ...form, eventEnd: fromDateTimeLocal(event.target.value) })
                  }
                />
              </Field>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4">
              <Field label="Herhaling" htmlFor="frequency">
                <Select
                  id="frequency"
                  value={recurrence.frequency}
                  onChange={(event) => {
                    const frequency = Number(event.target.value) as RecurrenceFrequency;
                    setForm({
                      ...form,
                      recurrence:
                        frequency === RecurrenceFrequency.None
                          ? null
                          : {
                              frequency,
                              dayOfWeek: recurrence.dayOfWeek ?? 1,
                              weekOfMonth:
                                frequency === RecurrenceFrequency.Monthly
                                  ? (recurrence.weekOfMonth ?? WeekOfMonth.First)
                                  : null,
                            },
                    });
                  }}
                >
                  <option value={RecurrenceFrequency.None}>Geen</option>
                  <option value={RecurrenceFrequency.Weekly}>Weekliks</option>
                  <option value={RecurrenceFrequency.Monthly}>Maandeliks</option>
                </Select>
              </Field>

              {recurrence.frequency !== RecurrenceFrequency.None && (
                <Field label="Dag van die week" htmlFor="dayOfWeek">
                  <Select
                    id="dayOfWeek"
                    value={recurrence.dayOfWeek ?? 1}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        recurrence: { ...recurrence, dayOfWeek: Number(event.target.value) },
                      })
                    }
                  >
                    {WEEKDAY_LABELS.map((label, index) => (
                      <option key={label} value={index}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {recurrence.frequency === RecurrenceFrequency.Monthly && (
                <Field label="Week van die maand" htmlFor="weekOfMonth">
                  <Select
                    id="weekOfMonth"
                    value={recurrence.weekOfMonth ?? WeekOfMonth.First}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        recurrence: {
                          ...recurrence,
                          weekOfMonth: Number(event.target.value) as WeekOfMonth,
                        },
                      })
                    }
                  >
                    {[
                      WeekOfMonth.First,
                      WeekOfMonth.Second,
                      WeekOfMonth.Third,
                      WeekOfMonth.Fourth,
                      WeekOfMonth.Last,
                    ].map((value) => (
                      <option key={value} value={value}>
                        {WEEK_OF_MONTH_LABELS[value]}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          </fieldset>
        </div>
      </Modal>

      <Modal
        isOpen={translationTarget !== null}
        title={`Vertalings — ${translationTarget?.title ?? ""}`}
        onClose={() => setTranslationTarget(null)}
      >
        {translationTarget && <TranslationsPanel content={translationTarget} />}
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Verwyder inhoud"
        message={`Verwyder "${deleteTarget?.title ?? ""}"?`}
        confirmLabel="Verwyder"
        isBusy={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}
