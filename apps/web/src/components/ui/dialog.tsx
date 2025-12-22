"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import * as React from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Dialog({ open, onClose, children }: DialogProps) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}

interface DialogPanelProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogPanel({ className, children }: DialogPanelProps) {
  return (
    <div
      className={cn(
        "relative mx-4 rounded-xl border border-border bg-card p-6 shadow-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DialogTitle({
  children,
  className,
}: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-lg font-semibold text-foreground", className)}>
      {children}
    </h2>
  );
}

export function DialogDescription({
  children,
  className,
}: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("mt-1 text-sm text-muted-foreground", className)}>
      {children}
    </p>
  );
}

export function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

export function DialogFooter({
  children,
  className,
}: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mt-6 flex items-center justify-end gap-3", className)}>
      {children}
    </div>
  );
}
