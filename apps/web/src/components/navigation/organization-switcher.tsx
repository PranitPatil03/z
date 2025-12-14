"use client";

import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { organizationsApi } from "@/lib/api/modules/organizations-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useSessionStore } from "@/store/session-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";

interface OrganizationSwitcherProps {
  className?: string;
  selectClassName?: string;
  alwaysShow?: boolean;
}

export function OrganizationSwitcher({
  className,
  selectClassName,
  alwaysShow = false,
}: OrganizationSwitcherProps) {
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

  const singleOrganization = organizations.length <= 1;

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

  if (!alwaysShow && singleOrganization) {
    return null;
  }

  if (organizations.length === 0) {
    return (
      <div
        className={cn(
          "rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground",
          className,
        )}
      >
        No organizations
      </div>
    );
  }

  return (
    <div className={cn(className ?? "hidden min-w-[180px] md:block")}>
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
        disabled={
          setActiveMutation.isPending ||
          organizationsQuery.isLoading ||
          singleOrganization
        }
        className={cn("h-8 bg-background text-xs", selectClassName)}
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
