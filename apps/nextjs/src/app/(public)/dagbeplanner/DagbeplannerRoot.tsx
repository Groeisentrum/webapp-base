"use client";

import { useEffect } from "react";
import { ConfirmDialog } from "@/shared/components/Modal";
import { useDagbeplannerStore } from "@/shared/stores/useDagbeplannerStore";
import { DesktopSidebar } from "@/app/(public)/dagbeplanner/DesktopSidebar";
import { MobileBar } from "@/app/(public)/dagbeplanner/MobileBar";
import { MobileDrawer } from "@/app/(public)/dagbeplanner/MobileDrawer";
import { ShareModal } from "@/app/(public)/dagbeplanner/ShareModal";
import { WizardModal } from "@/app/(public)/dagbeplanner/WizardModal";

const DESTRUCTIVE_COPY = {
  clear: {
    title: "Maak jou dagplan skoon?",
    message:
      "Dit verwyder al jou beplande stoppe. Jou begintyd en voorkeure bly staan.",
    confirmLabel: "Ja, maak skoon",
  },
  regenerate: {
    title: "Genereer 'n nuwe skedule?",
    message:
      "Dit sal jou huidige dagplan vervang. Hierdie stap kan nie ontdoen word nie.",
    confirmLabel: "Bevestig / Oorskryf",
  },
  import: {
    title: "'n Gedeelde dagplan is gevind",
    message:
      "Jy het reeds 'n aktiewe dagplan op hierdie toestel. Wil jy dit vervang met die gedeelde plan?",
    confirmLabel: "Oorskryf huidige plan",
  },
} as const;

/**
 * The single mount point for the whole widget — placed once in PublicShell as the flex
 * sibling that lets DesktopSidebar squeeze the page. Everything else it renders (mobile
 * bar, drawer, modals) is `position: fixed`, so nesting them here doesn't affect the
 * flex layout at all.
 */
export function DagbeplannerRoot() {
  const status = useDagbeplannerStore((state) => state.status);
  const hydrate = useDagbeplannerStore((state) => state.hydrate);
  const pendingDestructiveAction = useDagbeplannerStore(
    (state) => state.pendingDestructiveAction,
  );
  const confirmPendingAction = useDagbeplannerStore(
    (state) => state.confirmPendingAction,
  );
  const cancelPendingAction = useDagbeplannerStore(
    (state) => state.cancelPendingAction,
  );

  useEffect(() => {
    hydrate();
    // Runs once on mount only — hydrate() itself guards against re-hydrating.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "uninitialized") return null;

  const destructiveCopy = pendingDestructiveAction
    ? DESTRUCTIVE_COPY[pendingDestructiveAction.kind]
    : null;

  return (
    <>
      <DesktopSidebar />
      <MobileBar />
      <MobileDrawer />
      <WizardModal />
      <ShareModal />
      {destructiveCopy && (
        <ConfirmDialog
          isOpen
          title={destructiveCopy.title}
          message={destructiveCopy.message}
          confirmLabel={destructiveCopy.confirmLabel}
          onConfirm={confirmPendingAction}
          onCancel={cancelPendingAction}
        />
      )}
    </>
  );
}
