"use client";

import { Select } from "@/components/ui/select";
import { organizationsApi } from "@/lib/api/modules/organizations-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useSessionStore } from "@/store/session-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";

export function OrganizationSwitcher() {
  const router = useRouter();
  const qc = useQueryClient();
  const activeOrganizationId = useSessionStore(
    (state) => state.activeOrganizationId,
  );
  const setActiveOrganizationId = useSessionStore(
    (state) => state.setActiveOrganizationId,
  );

  const organizationsQuery = useQuery({
    queryKey: queryKeys.organizations.list(),
    queryFn: () => organizationsApi.list(),
    staleTime: 60_000,
  });

  const organizations = organizationsQuery.data ?? [];

  const selectedOrganizationId = useMemo(() => {
    if (activeOrganizationId) {
      return activeOrganizationId;
    }

    return organizations[0]?.id ?? "";
  }, [activeOrganizationId, organizations]);

  const setActiveMutation = useMutation({
    mutationFn: (organizationId: string) =>
      organizationsApi.setActive(organizationId),
    onMutate: async (organizationId) => {
      const previousOrganizationId =
        useSessionStore.getState().activeOrganizationId;
      setActiveOrganizationId(organizationId);
      return { previousOrganizationId };
    },
    onError: (error: Error, _organizationId, context) => {
      setActiveOrganizationId(context?.previousOrganizationId ?? null);
      toast.error(error.message);
    },
    onSuccess: (_response, organizationId) => {
      setActiveOrganizationId(organizationId);
      qc.invalidateQueries();
      router.refresh();
      toast.success("Organization switched");
    },
  });

  if (organizations.length <= 1) {
    return null;
  }

  return (
    <div className="hidden min-w-[180px] md:block">
      <Select
        value={selectedOrganizationId}
        onChange={(event) => {
          const nextOrganizationId = event.target.value;
          if (
            !nextOrganizationId ||
            nextOrganizationId === selectedOrganizationId
          ) {
            return;
          }

          setActiveMutation.mutate(nextOrganizationId);
        }}
        disabled={setActiveMutation.isPending || organizationsQuery.isLoading}
        className="h-8 bg-background text-xs"
      >
        {organizations.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
