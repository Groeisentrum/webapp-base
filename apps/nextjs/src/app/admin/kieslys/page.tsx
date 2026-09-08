"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, EmptyState, Field, Input, Panel, Select, Spinner } from "@/shared/components/ui";
import { ConfirmDialog, Modal } from "@/shared/components/Modal";
import { MenuLinkType, MenuType, type MenuItem } from "@/shared/interfaces/Domain";
import { getSafeUserMessageFromUnknownError } from "@/shared/lib/apiError";
import { getCategories } from "@/shared/services/adminService";
import {
  createMenuItem,
  deleteMenuItem,
  getMenuItems,
  updateMenuItem,
  type MenuItemInput,
} from "@/shared/services/contentService";

const MENU_TYPE_LABELS: Record<MenuType, string> = {
  [MenuType.None]: "—",
  [MenuType.Top]: "Boonste kieslys",
  [MenuType.BottomHover]: "Onderste sweefkieslys",
  [MenuType.Footer]: "Voetskrif",
};

const LINK_TYPE_LABELS: Record<MenuLinkType, string> = {
  [MenuLinkType.None]: "—",
  [MenuLinkType.Category]: "Kategorie",
  [MenuLinkType.StaticPage]: "Statiese bladsy",
  [MenuLinkType.ExternalLink]: "Eksterne skakel",
};

const emptyForm: MenuItemInput = {
  menuType: MenuType.Top,
  linkType: MenuLinkType.Category,
  label: "",
  categoryId: null,
  staticPageSlug: null,
  externalUrl: null,
  parentMenuItemId: null,
  sortOrder: 0,
};

export default function MenuItemsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<MenuItemInput>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const menuQuery = useQuery({ queryKey: ["menu-items"], queryFn: () => getMenuItems() });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories });

  const saveMutation = useMutation({
    mutationFn: (input: MenuItemInput) =>
      editing ? updateMenuItem(editing.id, input) : createMenuItem(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      closeForm();
    },
    onError: (error) => setErrorMessage(getSafeUserMessageFromUnknownError(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteMenuItem(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["menu-items"] });
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

  const openEdit = (menuItem: MenuItem) => {
    setEditing(menuItem);
    setForm({
      menuType: menuItem.menuType,
      linkType: menuItem.linkType,
      label: menuItem.label,
      categoryId: menuItem.categoryId,
      staticPageSlug: menuItem.staticPageSlug,
      externalUrl: menuItem.externalUrl,
      parentMenuItemId: menuItem.parentMenuItemId,
      sortOrder: menuItem.sortOrder,
    });
    setErrorMessage(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  if (menuQuery.isLoading) {
    return <Spinner />;
  }

  const menuItems = menuQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-(--text-primary)">Kieslys</h1>
        <Button onClick={openCreate}>Nuwe kieslysitem</Button>
      </div>

      {errorMessage && <Alert tone="danger">{errorMessage}</Alert>}

      <Panel description="Kieslyste is ten volle opstelbaar — geen roete is in die kode vasgelê nie.">
        {menuItems.length === 0 ? (
          <EmptyState message="Nog geen kieslysitems nie." />
        ) : (
          // Scrolls within the panel rather than widening the page on a tablet.
          <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="border-b border-(--panel-border) text-(--text-secondary)">
              <tr>
                <th className="py-2 pr-4 font-medium">Etiket</th>
                <th className="py-2 pr-4 font-medium">Kieslys</th>
                <th className="py-2 pr-4 font-medium">Skakel</th>
                <th className="py-2 pr-4 font-medium">Volgorde</th>
                <th className="py-2 pr-4 font-medium">Aksies</th>
              </tr>
            </thead>
            <tbody>
              {menuItems.map((item) => (
                <tr key={item.id} className="border-b border-(--panel-border) last:border-0">
                  <td className="py-2 pr-4 text-(--text-primary)">{item.label}</td>
                  <td className="py-2 pr-4 text-(--text-secondary)">
                    {MENU_TYPE_LABELS[item.menuType]}
                  </td>
                  <td className="py-2 pr-4 text-(--text-secondary)">
                    {LINK_TYPE_LABELS[item.linkType]}
                  </td>
                  <td className="py-2 pr-4 text-(--text-secondary)">{item.sortOrder}</td>
                  <td className="py-2 pr-4">
                    <span className="flex gap-1">
                      <Button variant="ghost" onClick={() => openEdit(item)}>
                        Wysig
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
          </div>
        )}
      </Panel>

      <Modal
        isOpen={isFormOpen}
        title={editing ? "Wysig kieslysitem" : "Nuwe kieslysitem"}
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
          <Field label="Etiket" htmlFor="label">
            <Input
              id="label"
              value={form.label}
              onChange={(event) => setForm({ ...form, label: event.target.value })}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Kieslys" htmlFor="menuType">
              <Select
                id="menuType"
                value={form.menuType}
                onChange={(event) =>
                  setForm({ ...form, menuType: Number(event.target.value) as MenuType })
                }
              >
                {[MenuType.Top, MenuType.BottomHover, MenuType.Footer].map((value) => (
                  <option key={value} value={value}>
                    {MENU_TYPE_LABELS[value]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Tipe skakel" htmlFor="linkType">
              <Select
                id="linkType"
                value={form.linkType}
                onChange={(event) =>
                  setForm({
                    ...form,
                    linkType: Number(event.target.value) as MenuLinkType,
                    categoryId: null,
                    staticPageSlug: null,
                    externalUrl: null,
                  })
                }
              >
                {[MenuLinkType.Category, MenuLinkType.StaticPage, MenuLinkType.ExternalLink].map(
                  (value) => (
                    <option key={value} value={value}>
                      {LINK_TYPE_LABELS[value]}
                    </option>
                  ),
                )}
              </Select>
            </Field>
          </div>

          {form.linkType === MenuLinkType.Category && (
            <Field label="Kategorie" htmlFor="categoryId">
              <Select
                id="categoryId"
                value={form.categoryId ?? ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    categoryId: event.target.value === "" ? null : Number(event.target.value),
                  })
                }
              >
                <option value="">Kies &apos;n kategorie</option>
                {(categoriesQuery.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {form.linkType === MenuLinkType.StaticPage && (
            <Field label="Bladsyskakel" htmlFor="staticPageSlug">
              <Input
                id="staticPageSlug"
                value={form.staticPageSlug ?? ""}
                onChange={(event) =>
                  setForm({ ...form, staticPageSlug: event.target.value || null })
                }
              />
            </Field>
          )}

          {form.linkType === MenuLinkType.ExternalLink && (
            <Field label="Webadres" htmlFor="externalUrl" hint="Moet met http:// of https:// begin.">
              <Input
                id="externalUrl"
                value={form.externalUrl ?? ""}
                onChange={(event) => setForm({ ...form, externalUrl: event.target.value || null })}
              />
            </Field>
          )}

          <Field label="Volgorde" htmlFor="sortOrder">
            <Input
              id="sortOrder"
              type="number"
              value={form.sortOrder}
              onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Verwyder kieslysitem"
        message={`Verwyder "${deleteTarget?.label ?? ""}"?`}
        confirmLabel="Verwyder"
        isBusy={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}
