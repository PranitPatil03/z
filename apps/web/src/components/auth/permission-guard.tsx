"use client";

import { usePermissionCheck } from "@/features/auth/hooks/use-permission-check";
import type { ReactNode } from "react";

interface PermissionGuardProps {
  permissionKey: string;
  projectId?: string;
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

export function PermissionGuard({
  permissionKey,
  projectId,
  children,
  fallback = null,
  loadingFallback = null,
}: PermissionGuardProps) {
  const { data: allowed, isLoading } = usePermissionCheck(
    permissionKey,
    projectId,
  );

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
