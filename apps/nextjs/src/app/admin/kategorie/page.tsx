"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, EmptyState, Field, Input, Panel, Select, Spinner } from "@/shared/components/ui";
import { ConfirmDialog, Modal } from "@/shared/components/Modal";
import { Visibility, type Category, type CategoryTreeNode } from "@/shared/interfaces/Domain";
import { VisibilityFields } from "@/shared/components/VisibilityFields";
import { getSafeUserMessageFromUnknownError } from "@/shared/lib/apiError";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryTree,
  updateCategory,
  type CategoryInput,
} from "@/shared/services/adminService";

const emptyForm: CategoryInput = {
  parentCategoryId: null,
  name: "",
  slug: "",
  colour: null,
  icon: null,
  sortOrder: 0,
  visibility: Visibility.Public,
  visibleToRoles: [],
};

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Category | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<CategoryInput>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<CategoryTreeNode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const treeQuery = useQuery({ queryKey: ["category-tree"], queryFn: getCategoryTree });
  const listQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["category-tree"] });
    void queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const saveMutation = useMutation({
    mutationFn: (input: CategoryInput) =>
      editing ? updateCategory(editing.id, input) : createCategory(input),
    onSuccess: () => {
      invalidate();
      closeForm();
    },
    onError: (error) => setErrorMessage(getSafeUserMessageFromUnknownError(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
    },
    onError: (error) => {
      setErrorMessage(getSafeUserMessageFromUnknownError(error));
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrorMessage(null);
    setIsFormOpen(true);
  };

  const openEdit = (node: CategoryTreeNode) => {
    const category = listQuery.data?.find((candidate) => candidate.id === node.id);
    if (!category) return;

    setEditing(category);
    setForm({
      parentCategoryId: category.parentCategoryId,
      name: category.name,
      slug: category.slug,
      colour: category.colour,
      icon: category.icon,
      sortOrder: category.sortOrder,
      visibility: category.visibility,
      visibleToRoles: category.visibleToRoles,
    });
    setErrorMessage(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  if (treeQuery.isLoading) {
    return <Spinner />;
  }

  const tree = treeQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-(--text-primary)">Kategorieë</h1>
        <Button onClick={openCreate}>Nuwe kategorie</Button>
      </div>

      {errorMessage && <Alert tone="danger">{errorMessage}</Alert>}

      <Panel description="Die struktuur hier bepaal die werf se afdelings. Niks is in die kode vasgelê nie.">
        {tree.length === 0 ? (
          <EmptyState message="Nog geen kategorieë nie. Skep die eerste een om te begin." />
        ) : (
          <ul className="flex flex-col gap-1">
            {tree.map((node) => (
              <CategoryRow
                key={node.id}
                node={node}
                depth={0}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </ul>
        )}
      </Panel>

      <Modal
        isOpen={isFormOpen}
        title={editing ? "Wysig kategorie" : "Nuwe kategorie"}
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
        <div className="flex flex-col gap-4">
          <Field label="Naam" htmlFor="name">
            <Input
              id="name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>

          <Field label="Skakelnaam" htmlFor="slug" hint="Moet uniek wees oor die hele werf.">
            <Input
              id="slug"
              value={form.slug}
              onChange={(event) => setForm({ ...form, slug: event.target.value })}
            />
          </Field>

          <Field label="Moederkategorie" htmlFor="parent">
            <Select
              id="parent"
              value={form.parentCategoryId ?? ""}
              onChange={(event) =>
                setForm({
                  ...form,
                  parentCategoryId: event.target.value === "" ? null : Number(event.target.value),
                })
              }
            >
              <option value="">Geen (hoofvlak)</option>
              {(listQuery.data ?? [])
                .filter((candidate) => candidate.id !== editing?.id)
                .map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
            </Select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Kleur" htmlFor="colour">
              <Input
                id="colour"
                value={form.colour ?? ""}
                onChange={(event) => setForm({ ...form, colour: event.target.value || null })}
              />
            </Field>
            <Field label="Ikoon" htmlFor="icon">
              <Input
                id="icon"
                value={form.icon ?? ""}
                onChange={(event) => setForm({ ...form, icon: event.target.value || null })}
              />
            </Field>
            <Field label="Volgorde" htmlFor="sortOrder">
              <Input
                id="sortOrder"
                type="number"
                value={form.sortOrder}
                onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })}
              />
            </Field>
          </div>

          <VisibilityFields
            idPrefix="category"
            cascades
            visibility={form.visibility}
            visibleToRoles={form.visibleToRoles}
            onChange={(next) => setForm({ ...form, ...next })}
          />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Verwyder kategorie"
        message={`Verwyder "${deleteTarget?.name ?? ""}"? Kategorieë met subkategorieë of inhoud kan nie verwyder word nie.`}
        confirmLabel="Verwyder"
        isBusy={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}

function CategoryRow({
  node,
  depth,
  onEdit,
  onDelete,
}: {
  node: CategoryTreeNode;
  depth: number;
  onEdit: (node: CategoryTreeNode) => void;
  onDelete: (node: CategoryTreeNode) => void;
}) {
  return (
    <li>
      <div
        className="flex items-center justify-between gap-2 rounded-md px-3 py-1 hover:bg-(--page-bg)"
        // Indentation is capped so a deep tree cannot squeeze the actions off-screen
        // on a narrower tablet viewport.
        style={{ paddingLeft: `${Math.min(depth, 4) * 1.25 + 0.75}rem` }}
      >
        <span className="min-w-0 truncate text-sm text-(--text-primary)">
          {node.name}
          <span className="ml-2 text-xs text-(--text-secondary)">/{node.slug}</span>
        </span>
        <span className="flex shrink-0 gap-1">
          <Button variant="ghost" onClick={() => onEdit(node)}>
            Wysig
          </Button>
          <Button variant="ghost" onClick={() => onDelete(node)}>
            Verwyder
          </Button>
        </span>
      </div>
      {node.children.length > 0 && (
        <ul className="flex flex-col gap-1">
          {node.children.map((child) => (
            <CategoryRow
              key={child.id}
              node={child}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
