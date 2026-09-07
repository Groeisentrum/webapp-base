"use client";

import { useEffect } from "react";
import { Button } from "@/shared/components/ui";

/**
 * A simple centred dialog. Escape closes it, and the body is locked while it is open
 * so the page behind cannot scroll away underneath.
 */
export function Modal({
  isOpen,
  title,
  onClose,
  children,
  footer,
}: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-(--panel-border) bg-(--panel-bg) p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-(--text-primary)">{title}</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Maak toe">
            &times;
          </Button>
        </div>
        {children}
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Bevestig",
  onConfirm,
  onCancel,
  isBusy = false,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isBusy?: boolean;
}) {
  return (
    <Modal
      isOpen={isOpen}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={isBusy}>
            Kanselleer
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isBusy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-(--text-secondary)">{message}</p>
    </Modal>
  );
}
