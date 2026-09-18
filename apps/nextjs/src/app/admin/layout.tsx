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
  { href: "/admin/kaart", label: "Kaart", adminOnly: false },
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

  const userChip = (
    <div className="flex items-center gap-3">
      <span className="max-w-[16rem] truncate text-sm text-(--text-secondary)">{user?.email}</span>
      <Button variant="secondary" onClick={handleSignOut}>
        Teken uit
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Below lg this is a stacked top bar; from lg it becomes the left sidebar.
          lg (1024px) is iPad landscape — portrait tablets get the horizontal nav. */}
      <aside className="border-b border-(--panel-border) bg-(--panel-bg) lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:py-4">
          <p className="text-sm font-semibold text-(--text-primary)">Administrasie</p>
          <div className="lg:hidden">{userChip}</div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:flex-col lg:overflow-x-visible lg:pb-4">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                // shrink-0 so the horizontal strip scrolls instead of squashing labels.
                className={
                  "inline-flex min-h-11 shrink-0 items-center rounded-md px-3 text-sm whitespace-nowrap " +
                  (isActive
                    ? "bg-(--brand-primary) text-(--text-inverse)"
                    : "text-(--text-secondary) hover:bg-(--page-bg)")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden items-center justify-end border-b border-(--panel-border) bg-(--panel-bg) px-6 py-3 lg:flex">
          {userChip}
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
