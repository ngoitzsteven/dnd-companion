"use client";

import { useEffect, useMemo, type ReactNode, useCallback } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, description, children, className }: ModalProps) {
  const portalTarget = useMemo(() => {
    if (typeof document === "undefined") {
      return null;
    }
    return document.body;
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const handleOverlayClick = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!open || !portalTarget) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        aria-hidden="true"
        onClick={handleOverlayClick}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        aria-describedby={description ? "modal-description" : undefined}
        className={cn(
          "relative z-10 w-full max-w-lg rounded-lg border border-slate-800 bg-slate-900 p-6 text-left shadow-xl",
          className
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-4">
          {(title || description) && (
            <div className="space-y-2">
              {title ? (
                <h2 id="modal-title" className="text-xl font-semibold text-white">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p id="modal-description" className="text-sm text-slate-400">
                  {description}
                </p>
              ) : null}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>,
    portalTarget
  );
}
