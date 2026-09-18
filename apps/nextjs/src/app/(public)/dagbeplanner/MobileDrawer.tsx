"use client";

import { Button } from "@/shared/components/ui";
import { cn } from "@/shared/lib/cn";
import { useDagbeplannerStore } from "@/shared/stores/useDagbeplannerStore";
import { ItineraryPanel } from "@/app/(public)/dagbeplanner/ItineraryPanel";
import { OnboardingChoice } from "@/app/(public)/dagbeplanner/OnboardingChoice";

/** The mobile bottom sheet the collapsed bar expands into. Desktop never renders this — it gets the squeeze sidebar instead. */
export function MobileDrawer() {
  const status = useDagbeplannerStore((state) => state.status);
  const isDrawerOpen = useDagbeplannerStore((state) => state.isDrawerOpen);
  const closeDrawer = useDagbeplannerStore((state) => state.closeDrawer);

  if (status === "uninitialized") return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 lg:hidden",
        isDrawerOpen ? "" : "pointer-events-none",
      )}
    >
      <div
        onClick={closeDrawer}
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity duration-300",
          isDrawerOpen ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Dagbeplanner"
        className={cn(
          "absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-(--panel-border) bg-(--panel-bg) shadow-2xl transition-transform duration-300",
          isDrawerOpen ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-(--panel-border) bg-(--panel-bg) px-4 py-3">
          <span className="text-sm font-semibold text-(--text-primary)">
            Dagbeplanner
          </span>
          <Button
            variant="ghost"
            onClick={closeDrawer}
            aria-label="Maak toe"
            className="min-h-11 min-w-11 p-2.5 text-lg"
          >
            &times;
          </Button>
        </div>
        <div className="p-4 pb-8">
          {status === "empty" ? <OnboardingChoice /> : <ItineraryPanel />}
        </div>
      </div>
    </div>
  );
}
