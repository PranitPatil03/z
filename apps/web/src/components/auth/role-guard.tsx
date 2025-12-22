"use client";

import { useActiveOrgRole } from "@/features/auth/hooks/use-active-org-role";
import type { ReactNode } from "react";

interface RoleGuardProps {
  allow: string[];
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

export function RoleGuard({
  allow,
  children,
  fallback = null,
  loadingFallback = null,
}: RoleGuardProps) {
  const { data: role, isLoading } = useActiveOrgRole();

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  if (!role || !allow.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
