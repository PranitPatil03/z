"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { organizationsApi } from "@/lib/api/modules/organizations-api";
import { queryKeys } from "@/lib/api/query-keys";
import { authClient } from "@/lib/auth-client";
import { isInternalProtectedPath } from "@/lib/auth/route-guards";
import { useSessionStore } from "@/store/session-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type PropsWithChildren, useEffect } from "react";
import { toast } from "sonner";

const SETUP_PATH = "/organization-setup";

type SessionWithActiveOrganization = {
  activeOrganizationId?: string;
};

function getSessionActiveOrganizationId(sessionValue: unknown): string | null {
  if (!sessionValue || typeof sessionValue !== "object") {
    return null;
  }

  if (!("activeOrganizationId" in sessionValue)) {
    return null;
  }

  const activeOrganizationId =
    (sessionValue as SessionWithActiveOrganization).activeOrganizationId ?? null;

  return typeof activeOrganizationId === "string" ? activeOrganizationId : null;
}

export function ActiveOrganizationGate({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data } = authClient.useSession();

  const setActiveOrganizationId = useSessionStore(
    (state) => state.setActiveOrganizationId,
  );
  const storedActiveOrganizationId = useSessionStore(
    (state) => state.activeOrganizationId,
  );

  const sessionResolved = typeof data !== "undefined";
  const isProtectedPath = isInternalProtectedPath(pathname);
  const isSetupPath = pathname === SETUP_PATH;
  const sessionActiveOrganizationId = getSessionActiveOrganizationId(
    data?.session,
  );
  const activeOrganizationId =
    sessionActiveOrganizationId ?? storedActiveOrganizationId;

  const organizationsQuery = useQuery({
    queryKey: queryKeys.organizations.list(),
    queryFn: () => organizationsApi.list(),
    enabled: Boolean(sessionResolved && data?.user && !activeOrganizationId),
    retry: 1,
    staleTime: 60_000,
  });

  const activateOrganizationMutation = useMutation({
    mutationFn: (organizationId: string) => organizationsApi.setActive(organizationId),
    onSuccess: async (_result, organizationId) => {
      setActiveOrganizationId(organizationId);
      await queryClient.invalidateQueries();
    },
  });

  useEffect(() => {
    if (!sessionActiveOrganizationId) {
      return;
    }

    setActiveOrganizationId(sessionActiveOrganizationId);
  }, [sessionActiveOrganizationId, setActiveOrganizationId]);

  useEffect(() => {
    if (!sessionResolved || !data?.user || activeOrganizationId || isSetupPath) {
      return;
    }

    if (organizationsQuery.isLoading || activateOrganizationMutation.isPending) {
      return;
    }

    const fallbackOrganizationId = organizationsQuery.data?.[0]?.id;

    if (!fallbackOrganizationId) {
      router.replace(SETUP_PATH);
      return;
    }

    activateOrganizationMutation.mutate(fallbackOrganizationId, {
      onError: (error: Error) => {
        toast.error(error.message);
        router.replace(SETUP_PATH);
      },
    });
  }, [
    activeOrganizationId,
    activateOrganizationMutation,
    data?.user,
    isSetupPath,
    organizationsQuery.data,
    organizationsQuery.isLoading,
    router,
    sessionResolved,
  ]);

  if (!isProtectedPath) {
    return <>{children}</>;
  }

  if (!sessionResolved) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading workspace
        </div>
      </div>
    );
  }

  if (!data?.user || activeOrganizationId || isSetupPath) {
    return <>{children}</>;
  }

  if (organizationsQuery.isLoading || activateOrganizationMutation.isPending) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing your organization
        </div>
      </div>
    );
  }

  if (organizationsQuery.isError) {
    return (
      <EmptyState
        icon={Building2}
        title="Organization setup required"
        description="We could not load your organizations. Continue to setup to create or select one."
        action={{
          label: "Open setup",
          onClick: () => router.replace(SETUP_PATH),
        }}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => organizationsQuery.refetch()}
        >
          Retry
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Redirecting to organization setup
      </div>
    </div>
  );
}
