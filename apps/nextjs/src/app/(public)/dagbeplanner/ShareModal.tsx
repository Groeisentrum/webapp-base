"use client";

import { useState } from "react";
import { Button, Input } from "@/shared/components/ui";
import { Modal } from "@/shared/components/Modal";
import { useDagbeplannerStore } from "@/shared/stores/useDagbeplannerStore";
import { PseudoQrCode } from "@/app/(public)/dagbeplanner/PseudoQrCode";

/**
 * The desktop "Save to phone" path. Mobile never reaches this: `ItineraryPanel`'s
 * share button calls `navigator.share` directly when it exists and only falls back to
 * this modal when it doesn't — feature detection rather than a screen-width guess.
 */
export function ShareModal() {
  const isShareModalOpen = useDagbeplannerStore(
    (state) => state.isShareModalOpen,
  );
  const closeShareModal = useDagbeplannerStore(
    (state) => state.closeShareModal,
  );
  const getShareUrl = useDagbeplannerStore((state) => state.getShareUrl);
  const [copied, setCopied] = useState(false);

  if (!isShareModalOpen) return null;

  const shareUrl = getShareUrl();

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be denied — the link is still visible and selectable in the field below.
    }
  };

  return (
    <Modal isOpen title="Stoor na jou foon" onClose={closeShareModal}>
      <div className="flex flex-col items-center gap-4">
        <p className="text-center text-sm text-(--text-secondary)">
          Skandeer met jou foon se kamera om jou dagplan daar oop te maak.
        </p>
        <PseudoQrCode value={shareUrl} />
        <div className="flex w-full items-center gap-2">
          <Input
            readOnly
            value={shareUrl}
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button variant="secondary" onClick={copyLink} className="shrink-0">
            {copied ? "Gekopieer!" : "Kopieer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
