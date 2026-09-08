import { fetchWithAutoLogoutOrThrow, parseJsonResponse } from "@/shared/lib/fetchWithAutoLogout";
import type {
  AuditLogEntry,
  Category,
  CategoryTreeNode,
  Paged,
  TenantSettings,
  Visibility,
} from "@/shared/interfaces/Domain";

const LOCAL_API = "/api/local/api";

export type TenantSettingsInput = {
  siteName: string;
  defaultLanguageCode: string;
  activeLanguageCodes: string[];
  privacyPolicyVersion: string;
  termsVersion: string;
  selfRegistrationEnabled: boolean;
  featureFlags: Record<string, boolean>;
  branding: {
    primaryColour?: string | null;
    secondaryColour?: string | null;
    accentColour?: string | null;
    headingFont?: string | null;
    bodyFont?: string | null;
    logoReference?: string | null;
    faviconReference?: string | null;
  };
  contactInfo: {
    emailAddress?: string | null;
    phoneNumber?: string | null;
    physicalAddress?: string | null;
    postalAddress?: string | null;
  };
};

export type CategoryInput = {
  parentCategoryId: number | null;
  name: string;
  slug: string;
  colour: string | null;
  icon: string | null;
  sortOrder: number;
  visibility: Visibility;
  visibleToRoles: string[];
};

export async function getTenantSettings(): Promise<TenantSettings> {
  const response = await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/tenant-settings`);

  return parseJsonResponse<TenantSettings>(response);
}

export async function updateTenantSettings(input: TenantSettingsInput): Promise<TenantSettings> {
  const response = await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/tenant-settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<TenantSettings>(response);
}

export async function getCategories(): Promise<Category[]> {
  const response = await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/categories`);

  return parseJsonResponse<Category[]>(response);
}

export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  const response = await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/categories/tree`);

  return parseJsonResponse<CategoryTreeNode[]>(response);
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const response = await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<Category>(response);
}

export async function updateCategory(id: number, input: CategoryInput): Promise<Category> {
  const response = await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<Category>(response);
}

export async function deleteCategory(id: number): Promise<void> {
  await fetchWithAutoLogoutOrThrow(`${LOCAL_API}/categories/${id}`, { method: "DELETE" });
}

export type AuditLogFilters = {
  entityType?: string;
  entityId?: number;
  page?: number;
  pageSize?: number;
};

export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<Paged<AuditLogEntry>> {
  const params = new URLSearchParams();

  if (filters.entityType) params.set("entityType", filters.entityType);
  if (filters.entityId !== undefined) params.set("entityId", String(filters.entityId));
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.pageSize !== undefined) params.set("pageSize", String(filters.pageSize));

  const query = params.toString();
  const response = await fetchWithAutoLogoutOrThrow(
    `${LOCAL_API}/audit-logs${query ? `?${query}` : ""}`,
  );

  return parseJsonResponse<Paged<AuditLogEntry>>(response);
}
