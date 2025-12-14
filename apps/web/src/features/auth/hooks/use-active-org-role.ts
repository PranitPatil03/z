"use client";

import {
  type ActiveOrgRole,
  authorizationApi,
} from "@/lib/api/modules/authorization-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useSessionStore } from "@/store/session-store";
import { useQuery } from "@tanstack/react-query";

export function useActiveOrgRole() {
  const activeOrganizationId = useSessionStore(
    (state) => state.activeOrganizationId,
  );

  return useQuery<ActiveOrgRole | null>({
    queryKey: queryKeys.authz.activeRole(activeOrganizationId ?? undefined),
    queryFn: () =>
      authorizationApi.getActiveMemberRole(activeOrganizationId ?? undefined),
    enabled: Boolean(activeOrganizationId),
    staleTime: 60_000,
  });
}
