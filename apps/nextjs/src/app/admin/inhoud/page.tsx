"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
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
  Visibility,
  WeekOfMonth,
  type Content,
} from "@/shared/interfaces/Domain";
import { VisibilityFields } from "@/shared/components/VisibilityFields";
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
import { LocationPanel } from "./LocationPanel";
import { TranslationsPanel } from "./TranslationsPanel";
import { ASSET_TYPE_LABELS } from "@/shared/lib/assetTypeLabels";
import { RichTextEditor } from "@/shared/components/RichTextEditor";

const WEEKDAY_LABELS = [
  "Sondag",
  "Maandag",
  "Dinsdag",
  "Woensdag",
  "Donderdag",
  "Vrydag",
  "Saterdag",
];

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
  visibility: Visibility.Public,
  visibleToRoles: [],
};

type ContentStatus = "published" | "draft" | "scheduled" | "expired";

function getContentStatus(item: Content): {
  status: ContentStatus;
  label: string;
  tone: "success" | "neutral" | "info" | "danger";
} {
  const now = new Date();

  if (!item.publishedAt) {
    return { status: "draft", label: "Konsep", tone: "neutral" };
  }

  const pubDate = new Date(item.publishedAt);
  if (pubDate > now) {
    return { status: "scheduled", label: "Geskeduleer", tone: "info" };
  }

  if (item.unpublishedAt) {
    const unpubDate = new Date(item.unpublishedAt);
    if (unpubDate <= now) {
      return { status: "expired", label: "Verval", tone: "danger" };
    }
  }

  return { status: "published", label: "Gepubliseer", tone: "success" };
}

function StatusBadge({ item }: { item: Content }) {
  const { label, tone } = getContentStatus(item);

  const toneClasses = {
    success:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    neutral:
      "bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700",
    info:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800",
    danger:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
  };

  const dotClasses = {
    success: "bg-emerald-500",
    neutral: "bg-neutral-400",
    info: "bg-sky-500",
    danger: "bg-rose-500",
  };

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[tone]}`} />
        {label}
      </span>
      {item.visibility !== Visibility.Public && (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
          title={
            item.visibility === Visibility.Restricted
              ? "Beperk tot spesifieke rolle"
              : "Slegs aangemelde gebruikers"
          }
        >
          🔒 Beperk
        </span>
      )}
    </span>
  );
}

export default function ContentPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Content | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<ContentInput>(emptyForm);
  type ModalTab = "content" | "location" | "translation";
  const [activeTab, setActiveTab] = useState<ModalTab>("content");
  const [deleteTarget, setDeleteTarget] = useState<Content | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<number | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | ContentStatus>("all");

  const contentQuery = useQuery({
    queryKey: ["content", { page: 1, pageSize: 100 }],
    queryFn: () => getContent({ page: 1, pageSize: 100 }),
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
    setActiveTab("content");
  };

  const openEdit = (content: Content, initialTab: ModalTab = "content") => {
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
      visibility: content.visibility,
      visibleToRoles: content.visibleToRoles,
    });
    setErrorMessage(null);
    setIsFormOpen(true);
    setActiveTab(initialTab);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const items = useMemo(() => contentQuery.data?.items ?? [], [contentQuery.data?.items]);
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  // Category ID to category lookup map
  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  // Status counts with explicit typing
  const statusCounts = useMemo(() => {
    const counts: Record<"all" | ContentStatus, number> = {
      all: items.length,
      published: 0,
      draft: 0,
      scheduled: 0,
      expired: 0,
    };
    items.forEach((item) => {
      const { status } = getContentStatus(item);
      counts[status] += 1;
    });
    return counts;
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q) ?? false;
        if (!matchesTitle && !matchesDesc) return false;
      }

      if (filterCategory !== "all" && item.categoryId !== filterCategory) {
        return false;
      }

      if (filterStatus !== "all") {
        const { status } = getContentStatus(item);
        if (status !== filterStatus) return false;
      }

      return true;
    });
  }, [items, searchQuery, filterCategory, filterStatus]);

  const hasActiveFilters = searchQuery !== "" || filterCategory !== "all" || filterStatus !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setFilterCategory("all");
    setFilterStatus("all");
  };

  if (contentQuery.isLoading) {
    return <Spinner />;
  }

  const recurrence = form.recurrence ?? {
    frequency: RecurrenceFrequency.None,
    dayOfWeek: null,
    weekOfMonth: null,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-(--text-primary)">Inhoud</h1>
        <Button onClick={openCreate}>Nuwe inhoud</Button>
      </div>

      {errorMessage && <Alert tone="danger">{errorMessage}</Alert>}
      {categories.length === 0 && (
        <Alert tone="warning">Skep eers &apos;n kategorie voordat jy inhoud byvoeg.</Alert>
      )}

      {/* Admin Filters & Search Bar */}
      <Panel className="p-4">
        <div className="flex flex-col gap-3">
          {/* Top Row: Search input + Category dropdown */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-secondary)"
              />
              <Input
                type="text"
                placeholder="Soek volgens titel of beskrywing..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-secondary) hover:text-(--text-primary)"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="w-full sm:w-64">
              <Select
                value={filterCategory}
                onChange={(e) =>
                  setFilterCategory(e.target.value === "all" ? "all" : Number(e.target.value))
                }
              >
                <option value="all">Alle kategorieë ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Bottom Row: Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-(--panel-border)">
            {[
              { id: "all" as const, label: "Alles", count: statusCounts.all },
              { id: "published" as const, label: "Gepubliseer", count: statusCounts.published },
              { id: "draft" as const, label: "Konsepte", count: statusCounts.draft },
              { id: "scheduled" as const, label: "Geskeduleer", count: statusCounts.scheduled },
              { id: "expired" as const, label: "Verval", count: statusCounts.expired },
            ].map((tab) => {
              const isActive = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterStatus(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${isActive
                    ? "bg-(--brand-primary) text-(--text-inverse)"
                    : "bg-(--page-bg) text-(--text-secondary) hover:text-(--text-primary)"
                    }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${isActive
                      ? "bg-black/20 text-white"
                      : "bg-(--panel-border) text-(--text-secondary)"
                      }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto inline-flex items-center gap-1 text-xs text-(--text-secondary) hover:text-(--state-danger) underline transition"
              >
                <X size={13} />
                Maak filters skoon
              </button>
            )}
          </div>
        </div>
      </Panel>

      {/* Main Content Table */}
      <Panel>
        {items.length === 0 ? (
          <EmptyState message="Nog geen inhoud geskep nie." />
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm font-medium text-(--text-primary)">
              Geen inhoud pas by jou soektog of filters nie.
            </p>
            <Button variant="ghost" onClick={clearFilters} className="mt-3 text-xs">
              Maak filters skoon
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-(--panel-border) text-(--text-secondary)">
                <tr>
                  <th className="py-2.5 pr-4 font-medium">Titel</th>
                  <th className="py-2.5 pr-4 font-medium">Kategorie</th>
                  <th className="py-2.5 pr-4 font-medium">Status</th>
                  <th className="py-2.5 pr-4 font-medium">Gepubliseer vanaf</th>
                  <th className="py-2.5 pr-4 font-medium">Geleentheid</th>
                  <th className="py-2.5 pr-4 font-medium">Aksies</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const cat = categoryMap.get(item.categoryId);
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-(--panel-border) last:border-0 hover:bg-(--page-bg)/50"
                    >
                      <td className="py-2.5 pr-4 font-medium text-(--text-primary)">
                        {item.title}
                      </td>
                      <td className="py-2.5 pr-4 text-(--text-secondary)">
                        {cat ? (
                          <span className="inline-flex items-center gap-1.5">
                            {cat.colour && (
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: cat.colour }}
                              />
                            )}
                            <span>{cat.name}</span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        <StatusBadge item={item} />
                      </td>
                      <td className="py-2.5 pr-4 text-(--text-secondary)">
                        {formatDateTime(item.publishedAt)}
                      </td>
                      <td className="py-2.5 pr-4 text-(--text-secondary)">
                        {formatDateTime(item.eventStart)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="flex gap-1">
                          <Button variant="ghost" onClick={() => openEdit(item, "content")}>
                            Wysig
                          </Button>
                          <Button variant="ghost" onClick={() => openEdit(item, "location")}>
                            Ligging
                          </Button>
                          <Button variant="ghost" onClick={() => openEdit(item, "translation")}>
                            Vertalings
                          </Button>
                          <Button variant="ghost" onClick={() => setDeleteTarget(item)}>
                            Verwyder
                          </Button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Unified 3-Tab Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        title={editing ? `Wysig: ${editing.title}` : "Nuwe inhoud"}
        onClose={closeForm}
        footer={
          activeTab === "content" ? (
            <>
              <Button variant="secondary" onClick={closeForm}>
                Kanselleer
              </Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Stoor tans..." : "Stoor"}
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={closeForm}>
              Maak toe
            </Button>
          )
        }
      >
        {/* Navigation Tabs (Only available when editing an existing item with an ID) */}
        {editing && (
          <div className="mb-6 flex border-b border-(--panel-border)">
            <button
              type="button"
              onClick={() => setActiveTab("content")}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition ${activeTab === "content"
                ? "border-(--brand-primary) text-(--brand-primary)"
                : "border-transparent text-(--text-secondary) hover:text-(--text-primary)"
                }`}
            >
              Inhoud
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("location")}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition ${activeTab === "location"
                ? "border-(--brand-primary) text-(--brand-primary)"
                : "border-transparent text-(--text-secondary) hover:text-(--text-primary)"
                }`}
            >
              Ligging & Kaartpen
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("translation")}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition ${activeTab === "translation"
                ? "border-(--brand-primary) text-(--brand-primary)"
                : "border-transparent text-(--text-secondary) hover:text-(--text-primary)"
                }`}
            >
              Vertalings
            </button>
          </div>
        )}

        {/* Tab 2: Location / Map Pins */}
        {activeTab === "location" && editing && (
          <LocationPanel content={editing} />
        )}

        {/* Tab 3: Translations */}
        {activeTab === "translation" && editing && (
          <TranslationsPanel content={editing} />
        )}

        {/* Tab 1: Content Form */}
        {activeTab === "content" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-2 flex flex-col gap-4">
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

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-(--text-primary)">
                  Hoofteks / Artikelinhoud
                </label>
                <RichTextEditor
                  value={form.body ?? ""}
                  onChange={(html) => setForm({ ...form, body: html || null })}
                />
              </div>
            </div>

            <div className="md:col-span-1 flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                <Field label="Media-verwysing" htmlFor="assetReference">
                  <Input
                    id="assetReference"
                    value={form.assetReference ?? ""}
                    onChange={(event) =>
                      setForm({ ...form, assetReference: event.target.value || null })
                    }
                  />
                </Field>
              </div>

              <fieldset className="rounded-md border border-(--panel-border) p-4">
                <legend className="px-1 text-sm font-medium text-(--text-primary)">
                  Publikasievenster
                </legend>
                <p className="mt-1 text-xs text-(--text-secondary)">
                  Wanneer die inhoud op die werf verskyn. Los leeg vir onmiddellike of permanente
                  publikasie.
                </p>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Gepubliseer vanaf" htmlFor="publishedAt">
                    <Input
                      id="publishedAt"
                      type="datetime-local"
                      value={toDateTimeLocal(form.publishedAt)}
                      onChange={(event) =>
                        setForm({ ...form, publishedAt: fromDateTimeLocal(event.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Ontpubliseer op" htmlFor="unpublishedAt">
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
                <legend className="px-1 text-sm font-medium text-(--text-primary)">
                  Geleentheid
                </legend>
                <p className="mt-1 text-xs text-(--text-secondary)">
                  Wanneer die geleentheid self plaasvind. Onafhanklik van publikasie: die item bly
                  sigbaar solank die publikasievenster oop is.
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
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

              <VisibilityFields
                idPrefix="content"
                visibility={form.visibility}
                visibleToRoles={form.visibleToRoles}
                onChange={(next) => setForm({ ...form, ...next })}
              />
            </div>
          </div>
        )}
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