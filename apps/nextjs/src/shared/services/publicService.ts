import type {
  CategoryTreeNode,
  MenuItem,
  MenuType,
  Paged,
  PublicContent,
  PublicLocation,
  PublicSiteConfig,
} from "@/shared/interfaces/Domain";
import { getLocalApiBaseUrl } from "@/app/api/utils/serviceUrls";

/**
 * Reads the public surface. Never wrapped in the auto-logout fetcher: these calls are
 * anonymous, so a failure here is not a session problem.
 *
 * Server components call the local API directly; browser code goes through the
 * app's own `/api/public` route, which the base URL resolves to when running client-side.
 */
function publicBase(): string {
  return typeof window === "undefined" ? `${getLocalApiBaseUrl()}/api/public` : "/api/public";
}

async function getJson<TValue>(path: string): Promise<TValue> {
  const response = await fetch(`${publicBase()}${path}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Public request failed: ${response.status}`);
  }

  return (await response.json()) as TValue;
}

export async function getSiteConfig(): Promise<PublicSiteConfig> {
  return getJson<PublicSiteConfig>("/site-config");
}

export async function getPublicCategories(language?: string): Promise<CategoryTreeNode[]> {
  const query = language ? `?language=${encodeURIComponent(language)}` : "";

  return getJson<CategoryTreeNode[]>(`/categories${query}`);
}

export async function getPublicContent(options: {
  categoryId?: number;
  language?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paged<PublicContent>> {
  const params = new URLSearchParams();

  if (options.categoryId !== undefined) params.set("categoryId", String(options.categoryId));
  if (options.language) params.set("language", options.language);
  if (options.search) params.set("search", options.search);
  if (options.page !== undefined) params.set("page", String(options.page));
  if (options.pageSize !== undefined) params.set("pageSize", String(options.pageSize));

  const query = params.toString();

  return getJson<Paged<PublicContent>>(`/content${query ? `?${query}` : ""}`);
}

export async function getPublicContentById(
  id: number,
  language?: string,
): Promise<PublicContent> {
  const query = language ? `?language=${encodeURIComponent(language)}` : "";

  return getJson<PublicContent>(`/content/${id}${query}`);
}

export async function getPublicMenuItems(
  menuType?: MenuType,
  language?: string,
): Promise<MenuItem[]> {
  const params = new URLSearchParams();

  if (menuType !== undefined) params.set("menuType", String(menuType));
  if (language) params.set("language", language);

  const query = params.toString();

  return getJson<MenuItem[]>(`/menu-items${query ? `?${query}` : ""}`);
}

/**
 * Every published point of interest the caller may see.
 *
 * The single source for map pins and itinerary stops — both features read this rather
 * than keeping their own copy, so a pin that is renamed, hidden or unpublished changes
 * for both at once. Pass `categoryId` to draw one section of the site only.
 */
export async function getPublicLocations(options: {
  categoryId?: number;
  language?: string;
} = {}): Promise<PublicLocation[]> {
  const params = new URLSearchParams();

  if (options.categoryId !== undefined) params.set("categoryId", String(options.categoryId));
  if (options.language) params.set("language", options.language);

  const query = params.toString();

  return getJson<PublicLocation[]>(`/locations${query ? `?${query}` : ""}`);
}
