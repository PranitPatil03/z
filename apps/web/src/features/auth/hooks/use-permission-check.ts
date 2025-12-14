"use client";

import { authorizationApi } from "@/lib/api/modules/authorization-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useSessionStore } from "@/store/session-store";
import { useQuery } from "@tanstack/react-query";

export function usePermissionCheck(
  permissionKey: string,
  projectId?: string,
  enabled = true,
) {
  const activeOrganizationId = useSessionStore(
    (state) => state.activeOrganizationId,
  );

  return useQuery<boolean>({
    queryKey: queryKeys.authz.permission(permissionKey, projectId),
    queryFn: () => authorizationApi.checkPermission(permissionKey, projectId),
    enabled:
      enabled && permissionKey.length > 0 && Boolean(activeOrganizationId),
    staleTime: 30_000,
  });
}
