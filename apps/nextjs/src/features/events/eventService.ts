import {
  getPublicCategories,
  getPublicContent,
} from "@/shared/services/publicService";
import type { CategoryTreeNode } from "@/shared/interfaces/Domain";
import { toVisitorEvent, type VisitorEvent } from "./eventModel";

/** Follow every public page: the first page alone would silently hide future events. */
export async function getVisitorEvents(
  language: string,
): Promise<VisitorEvent[]> {
  const [categories, first] = await Promise.all([
    getPublicCategories(language),
    getPublicContent({ language, page: 1, pageSize: 100 }),
  ]);
  const names = new Map<number, string>();
  const visit = (nodes: CategoryTreeNode[]) =>
    nodes.forEach((node) => {
      names.set(node.id, node.name);
      visit(node.children);
    });
  visit(categories);
  const items = [...first.items];
  for (let page = 2; page <= first.totalPages; page++) {
    const result = await getPublicContent({
      language,
      page,
      pageSize: first.pageSize,
    });
    items.push(...result.items);
  }
  return [...new Map(items.map((item) => [item.id, item])).values()]
    .filter(
      (item) =>
        item.eventStart || item.eventEnd || item.recurrence.frequency !== 0,
    )
    .map((item) =>
      toVisitorEvent(item, names.get(item.categoryId) ?? "Geleentheid"),
    );
}
