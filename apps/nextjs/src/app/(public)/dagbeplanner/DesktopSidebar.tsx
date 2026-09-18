"use client";

import { Button } from "@/shared/components/ui";
import { cn } from "@/shared/lib/cn";
import { useDagbeplannerStore } from "@/shared/stores/useDagbeplannerStore";
import { ItineraryPanel } from "@/app/(public)/dagbeplanner/ItineraryPanel";
import { OnboardingChoice } from "@/app/(public)/dagbeplanner/OnboardingChoice";
import { DESKTOP_SIDEBAR_WIDTH_PX } from "@/app/(public)/dagbeplanner/uiConstants";

/**
 * The desktop rail. A genuine flex sibling of the page content (see PublicShell), so
 * animating its width actually reduces the space the main content gets — not an
 * overlay floating on top of it.
 */
export function DesktopSidebar() {
  const status = useDagbeplannerStore((state) => state.status);
  const isSidebarOpen = useDagbeplannerStore((state) => state.isSidebarOpen);
  const toggleSidebar = useDagbeplannerStore((state) => state.toggleSidebar);

  if (status === "uninitialized") return null;

  return (
    <>
      <aside
        aria-label="Dagbeplanner"
        className="hidden shrink-0 overflow-hidden border-l border-(--panel-border) bg-(--panel-bg) transition-[width] duration-300 ease-in-out lg:block"
        style={{ width: isSidebarOpen ? DESKTOP_SIDEBAR_WIDTH_PX : 0 }}
      >
        <div
          style={{ width: DESKTOP_SIDEBAR_WIDTH_PX }}
          className="flex h-full flex-col"
        >
          <div className="flex items-center justify-between border-b border-(--panel-border) px-4 py-3">
            <span className="text-sm font-semibold text-(--text-primary)">
              Dagbeplanner
            </span>
            <Button
              variant="ghost"
              onClick={toggleSidebar}
              aria-label="Maak toe"
              className="min-h-11 min-w-11 p-2.5 text-lg"
            >
              &times;
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {status === "empty" ? <OnboardingChoice /> : <ItineraryPanel />}
          </div>
        </div>
      </aside>

      {/* Before a plan exists this is the primary "Plan My Day" call to action, so it
          gets the same navy treatment as the onboarding buttons; once a plan exists
          it's just a reopen utility, so it drops back to neutral chrome. */}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={
          isSidebarOpen ? "Maak dagbeplanner toe" : "Maak dagbeplanner oop"
        }
        className={cn(
          "fixed top-1/2 right-0 z-40 hidden -translate-y-1/2 items-center gap-1.5 rounded-l-md px-2 py-3 text-xs font-semibold shadow-md lg:flex",
          status === "empty"
            ? "bg-(--dagbeplanner-primary) text-(--text-inverse)"
            : "border border-r-0 border-(--panel-border) bg-(--panel-bg) text-(--text-primary)",
          isSidebarOpen && "lg:hidden",
        )}
        style={{ writingMode: "vertical-rl" }}
      >
        <span aria-hidden="true">📅</span> Dagplan
      </button>
    </>
  );
}
