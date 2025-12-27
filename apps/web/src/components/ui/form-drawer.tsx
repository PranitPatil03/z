"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId } from "react";
import { Button } from "./button";

interface FormDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg";
}

const WIDTH_CLASS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function FormDrawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "md",
}: FormDrawerProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal"
        className={cn(
          "fixed inset-0 z-[120] bg-black/55 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />

      {/* Modal container */}
      <div
        className={cn(
          "fixed inset-0 z-[130] flex items-center justify-center p-3 transition-opacity duration-200 sm:p-6",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          className={cn(
            "flex max-h-[calc(100vh-1.5rem)] w-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl transition-all duration-200",
            WIDTH_CLASS[width],
            open
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-2 scale-95 opacity-0",
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border px-6 py-4">
            <div>
              <h2 id={titleId} className="text-base font-semibold text-foreground">
                {title}
              </h2>
              {description && (
                <p
                  id={descriptionId}
                  className="mt-0.5 text-sm text-muted-foreground"
                >
                  {description}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="border-t border-border bg-card px-6 py-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
