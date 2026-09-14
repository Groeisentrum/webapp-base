import { describe, expect, it } from "vitest";
import { MenuLinkType, MenuType, Visibility } from "@/shared/interfaces/Domain";
import type { CategoryTreeNode, MenuItem } from "@/shared/interfaces/Domain";
import { buildCategorySlugs, buildMenuHref, buildMenuTree } from "@/shared/lib/menuTree";

function menuItem(overrides: Partial<MenuItem> & { id: number }): MenuItem {
  return {
    menuType: MenuType.BottomHover,
    linkType: MenuLinkType.Category,
    label: `Item ${overrides.id}`,
    categoryId: null,
    staticPageSlug: null,
    externalUrl: null,
    parentMenuItemId: null,
    sortOrder: 0,
    visibility: Visibility.Public,
    visibleToRoles: [],
    createdAt: "2026-09-14T00:00:00Z",
    updatedAt: null,
    ...overrides,
  };
}

function category(overrides: Partial<CategoryTreeNode> & { id: number; slug: string }): CategoryTreeNode {
  return {
    parentCategoryId: null,
    name: overrides.slug,
    colour: null,
    icon: null,
    sortOrder: 0,
    children: [],
    ...overrides,
  };
}

describe("buildCategorySlugs", () => {
  it("collects slugs from every level of the tree", () => {
    const tree = [
      category({
        id: 1,
        slug: "besoek",
        children: [category({ id: 2, slug: "geskiedenis" })],
      }),
    ];

    const slugs = buildCategorySlugs(tree);

    expect(slugs.get(1)).toBe("besoek");
    expect(slugs.get(2)).toBe("geskiedenis");
  });
});

describe("buildMenuTree", () => {
  it("nests children under their parent, ordered by sortOrder", () => {
    const tree = buildMenuTree([
      menuItem({ id: 20, parentMenuItemId: 10, sortOrder: 2 }),
      menuItem({ id: 10, sortOrder: 1 }),
      menuItem({ id: 30, parentMenuItemId: 10, sortOrder: 1 }),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe(10);
    expect(tree[0].children.map((child) => child.id)).toEqual([30, 20]);
  });

  it("orders roots by sortOrder", () => {
    const tree = buildMenuTree([
      menuItem({ id: 4, sortOrder: 4 }),
      menuItem({ id: 1, sortOrder: 1 }),
      menuItem({ id: 3, sortOrder: 3 }),
    ]);

    expect(tree.map((node) => node.id)).toEqual([1, 3, 4]);
  });

  // The API hid the parent on purpose. Promoting an orphan to the top level would
  // put a restricted section's children straight into the main navigation.
  it("drops a child whose parent was filtered out rather than promoting it", () => {
    const tree = buildMenuTree([menuItem({ id: 20, parentMenuItemId: 10 })]);

    expect(tree).toEqual([]);
  });
});

describe("buildMenuHref", () => {
  const slugs = new Map([[7, "besoek"]]);

  it("builds a category link from the slug and carries the language", () => {
    const href = buildMenuHref(
      menuItem({ id: 1, linkType: MenuLinkType.Category, categoryId: 7 }),
      slugs,
      "en",
    );

    expect(href).toBe("/kategorie/besoek?taal=en");
  });

  it("returns null when the category is not in the visible tree", () => {
    const href = buildMenuHref(
      menuItem({ id: 1, linkType: MenuLinkType.Category, categoryId: 99 }),
      slugs,
      "af",
    );

    expect(href).toBeNull();
  });

  it("builds a static page link", () => {
    const href = buildMenuHref(
      menuItem({ id: 2, linkType: MenuLinkType.StaticPage, staticPageSlug: "privaatheid" }),
      slugs,
      "af",
    );

    expect(href).toBe("/privaatheid?taal=af");
  });

  // The language of another site is not ours to set.
  it("leaves an external link exactly as configured", () => {
    const href = buildMenuHref(
      menuItem({
        id: 3,
        linkType: MenuLinkType.ExternalLink,
        externalUrl: "https://voorbeeld.co.za/toer",
      }),
      slugs,
      "en",
    );

    expect(href).toBe("https://voorbeeld.co.za/toer");
  });

  it("returns null for an item that points nowhere", () => {
    expect(buildMenuHref(menuItem({ id: 4, linkType: MenuLinkType.None }), slugs, "af")).toBeNull();
  });
});
