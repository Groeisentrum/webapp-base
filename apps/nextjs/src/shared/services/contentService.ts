import { fetchWithAutoLogoutOrThrow, parseJsonResponse } from "@/shared/lib/fetchWithAutoLogout";
import type {
  AssetType,
  Content,
  LocationDetail,
  MenuItem,
  MenuLinkType,
  MenuType,
  Paged,
  RecurrenceFrequency,
  Translation,
  WeekOfMonth,
} from "@/shared/interfaces/Domain";

const LOCAL_API = "/api/local/api";

export type ContentInput = {
  categoryId: number;
  title: string;
  description: string | null;
  body: string | null;
  assetType: AssetType;
  assetReference: string | null;
  /** Site visibility. Independent of the event fields below. */
  publishedAt: string | null;
  unpublishedAt: string | null;
  /** When the event happens. Independent of the publish window above. */
  eventStart: string | null;
  eventEnd: string | null;
  recurrence: {
    frequency: RecurrenceFrequency;
    dayOfWeek: number | null;
    weekOfMonth: WeekOfMonth | null;
  } | null;
};

export type ContentFilters = {
  categoryId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function getContent(filters: ContentFilters = {}): Promise<Paged<Content>> {
  const params = new URLSearchParams();

  if (filters.categoryId !== undefined) params.set("categoryId", String(filters.categoryId));
  if (filters.search) params.set("search", filters.search);
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.pageSize !== undefined) params.set("pageSize", String(filters.pageSize));

  const query = params.toString();
  const response = await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/content${query ? `?${query}` : ""}`);

  return parseJsonResponse<Paged<Content>>(response);
}

export async function getContentById(id: number): Promise<Content> {
  const response = await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/content/${id}`);

  return parseJsonResponse<Content>(response);
}

export async function createContent(input: ContentInput): Promise<Content> {
  const response = await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/content`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<Content>(response);
}

export async function updateContent(id: number, input: ContentInput): Promise<Content> {
  const response = await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/content/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<Content>(response);
}

export async function deleteContent(id: number): Promise<void> {
  await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/content/${id}`, { method: "DELETE" });
}

export async function getTranslations(entityType: string, entityId: number): Promise<Translation[]> {
  const params = new URLSearchParams({ entityType, entityId: String(entityId) });
  const response = await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/translations?${params}`);

  return parseJsonResponse<Translation[]>(response);
}

/** Creates or replaces the value for one field, in one language, on one entity. */
export async function upsertTranslation(input: {
  entityType: string;
  entityId: number;
  fieldName: string;
  languageCode: string;
  value: string;
}): Promise<Translation> {
  const response = await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/translations`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<Translation>(response);
}

export async function deleteTranslation(id: number): Promise<void> {
  await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/translations/${id}`, { method: "DELETE" });
}

export type MenuItemInput = {
  menuType: MenuType;
  linkType: MenuLinkType;
  label: string;
  categoryId: number | null;
  staticPageSlug: string | null;
  externalUrl: string | null;
  parentMenuItemId: number | null;
  sortOrder: number;
};

export async function getMenuItems(menuType?: MenuType): Promise<MenuItem[]> {
  const query = menuType === undefined ? "" : `?menuType=${menuType}`;
  const response = await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/menu-items${query}`);

  return parseJsonResponse<MenuItem[]>(response);
}

export async function createMenuItem(input: MenuItemInput): Promise<MenuItem> {
  const response = await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/menu-items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<MenuItem>(response);
}

export async function updateMenuItem(id: number, input: MenuItemInput): Promise<MenuItem> {
  const response = await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/menu-items/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<MenuItem>(response);
}

export async function deleteMenuItem(id: number): Promise<void> {
  await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/menu-items/${id}`, { method: "DELETE" });
}

export type LocationInput = {
  latitude: number;
  longitude: number;
  label: string | null;
  addressLine: string | null;
  notes: string | null;
};

export async function getLocations(contentId: number): Promise<LocationDetail[]> {
  const response = await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/locations?contentId=${contentId}`);

  return parseJsonResponse<LocationDetail[]>(response);
}

export async function createLocation(
  input: LocationInput & { contentId: number },
): Promise<LocationDetail> {
  const response = await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/locations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<LocationDetail>(response);
}

export async function updateLocation(id: number, input: LocationInput): Promise<LocationDetail> {
  const response = await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/locations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<LocationDetail>(response);
}

export async function deleteLocation(id: number): Promise<void> {
  await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/locations/${id}`, { method: "DELETE" });
}
