"use client";

import { isInternalProtectedPath } from "@/lib/auth/route-guards";
import { useHeaderStore } from "@/store/header-store";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { type ReactNode, useLayoutEffect } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  const pathname = usePathname();
  const setHeaderOverride = useHeaderStore((state) => state.setHeaderOverride);
  const clearHeaderOverride = useHeaderStore((state) => state.clearHeaderOverride);
  const projectToTopHeader = isInternalProtectedPath(pathname);

  useLayoutEffect(() => {
    if (!projectToTopHeader) {
      return;
    }

    setHeaderOverride(pathname, title, description ?? null);

    return () => {
      clearHeaderOverride();
    };
  }, [
    clearHeaderOverride,
    description,
    pathname,
    projectToTopHeader,
    setHeaderOverride,
    title,
  ]);

  if (projectToTopHeader) {
    if (!action) {
      return null;
    }

    return (
      <div className={cn("flex items-start justify-end gap-4", className)}>
        <div className="shrink-0">{action}</div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
