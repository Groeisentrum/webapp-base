"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button, Spinner } from "@/shared/components/ui";
import { canManageContent, isAdmin } from "@/shared/lib/authRoles";
import { logout } from "@/shared/services/authService";
import { useAuthStore } from "@/shared/stores/useAuthStore";

type NavItem = {
  href: string;
  label: string;
  adminOnly: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Oorsig", adminOnly: false },
  { href: "/admin/instellings", label: "Werfinstellings", adminOnly: true },
  { href: "/admin/kategorie", label: "Kategorieë", adminOnly: true },
  { href: "/admin/inhoud", label: "Inhoud", adminOnly: false },
  { href: "/admin/kieslys", label: "Kieslys", adminOnly: false },
  { href: "/admin/oudit", label: "Ouditspoor", adminOnly: true },
];

/**
 * Admin shell. Desktop-only by design — the brief scopes the admin area to desktop,
 * so no mobile layout is provided.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const mayManageContent = canManageContent(user);

  useEffect(() => {
    // Wait for hydration before judging access, otherwise a signed-in user is
    // bounced on every reload while the session is still loading.
    if (!isInitialized) return;

    if (!mayManageContent) {
      router.replace("/aanmeld");
    }
  }, [isInitialized, mayManageContent, router]);

  if (!isInitialized) {
    return <Spinner label="Kontroleer jou sessie..." />;
  }

  if (!mayManageContent) {
    return <Spinner label="Herlei..." />;
  }

  const visibleNavItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin(user));

  const handleSignOut = async () => {
    await logout();
    clearAuth();
    router.push("/aanmeld");
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-(--panel-border) bg-(--panel-bg) p-4">
        <p className="px-2 pb-4 text-sm font-semibold text-(--text-primary)">Administrasie</p>
        <nav className="flex flex-col gap-1">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "rounded-md bg-(--brand-primary) px-3 py-2 text-sm text-(--text-inverse)"
                    : "rounded-md px-3 py-2 text-sm text-(--text-secondary) hover:bg-(--page-bg)"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-(--panel-border) bg-(--panel-bg) px-6 py-3">
          <span className="text-sm text-(--text-secondary)">{user?.email}</span>
          <Button variant="secondary" onClick={handleSignOut}>
            Teken uit
          </Button>
        </header>
        <main className="flex-1 overflow-x-auto p-6">{children}</main>
      </div>
    </div>
  );
}
