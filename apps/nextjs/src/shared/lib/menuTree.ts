import { MenuLinkType } from "@/shared/interfaces/Domain";
import type { CategoryTreeNode, MenuItem } from "@/shared/interfaces/Domain";
import { LANGUAGE_PARAM } from "@/shared/lib/languageHref";

/** A menu item with its children attached, ready to render as a nested menu. */
export type MenuNode = MenuItem & { children: MenuNode[] };

/**
 * Flattens the category tree into id-to-slug pairs.
 *
 * Menu items point at a category by id, but the public routes are addressed by slug.
 * Resolving it here rather than widening the API response keeps the menu contract as
 * it is, and the caller already holds the category tree.
 */
export function buildCategorySlugs(tree: CategoryTreeNode[]): Map<number, string> {
  const slugs = new Map<number, string>();

  const walk = (nodes: CategoryTreeNode[]) => {
    for (const node of nodes) {
      slugs.set(node.id, node.slug);
      walk(node.children);
    }
  };

  walk(tree);

  return slugs;
}

/**
 * Nests a flat menu list by `parentMenuItemId`, ordered by `sortOrder`.
 *
 * An item whose parent was filtered out by visibility is dropped rather than
 * promoted to the top level: the API hid the parent deliberately, and surfacing its
 * children would defeat that.
 */
export function buildMenuTree(items: MenuItem[]): MenuNode[] {
  const byId = new Map<number, MenuNode>(
    items.map((item) => [item.id, { ...item, children: [] }]),
  );

  const roots: MenuNode[] = [];

  for (const node of byId.values()) {
    if (node.parentMenuItemId === null) {
      roots.push(node);
      continue;
    }

    byId.get(node.parentMenuItemId)?.children.push(node);
  }

  const sort = (nodes: MenuNode[]): MenuNode[] =>
    nodes
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((node) => ({ ...node, children: sort(node.children) }));

  return sort(roots);
}

/**
 * The URL a menu item points at, or null when it points nowhere.
 *
 * The chosen language rides along on internal links so following the menu does not
 * silently drop the visitor back to the site's default language. External links are
 * left exactly as configured — the language of another site is not ours to set.
 */
export function buildMenuHref(
  item: MenuItem,
  categorySlugs: Map<number, string>,
  language: string,
): string | null {
  const withLanguage = (path: string) =>
    `${path}?${LANGUAGE_PARAM}=${encodeURIComponent(language)}`;

  switch (item.linkType) {
    case MenuLinkType.Category: {
      if (item.categoryId === null) return null;

      const slug = categorySlugs.get(item.categoryId);

      return slug ? withLanguage(`/kategorie/${slug}`) : null;
    }

    case MenuLinkType.StaticPage:
      return item.staticPageSlug ? withLanguage(`/${item.staticPageSlug}`) : null;

    case MenuLinkType.ExternalLink:
      return item.externalUrl ?? null;

    default:
      return null;
  }
}
