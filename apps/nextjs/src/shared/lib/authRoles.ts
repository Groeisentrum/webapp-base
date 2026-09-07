import type { AuthUser } from "@/shared/interfaces/AuthState";

/** Role names as issued by SkaapHond. Must match the C# API's Roles constants. */
export const ROLES = {
  admin: "Admin",
  content: "Content",
} as const;

function hasRole(user: AuthUser | null, role: string): boolean {
  return user?.roles.some((candidate) => candidate.toLowerCase() === role.toLowerCase()) ?? false;
}

/** Admins configure the site: settings, feature flags, languages and category structure. */
export function isAdmin(user: AuthUser | null): boolean {
  return hasRole(user, ROLES.admin);
}

/**
 * True for anyone who may manage content. Admins are included: an admin who configures
 * a site should not be locked out of the content inside it.
 */
export function canManageContent(user: AuthUser | null): boolean {
  return hasRole(user, ROLES.admin) || hasRole(user, ROLES.content);
}

/** True when the user holds any role this app recognises. */
export function hasAnyKnownRole(user: AuthUser | null): boolean {
  return isAdmin(user) || canManageContent(user);
}
