"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import {
  organizationsApi,
  type Organization,
} from "@/lib/api/modules/organizations-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useSessionStore } from "@/store/session-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export default function OrganizationSetupPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const activeOrganizationId = useSessionStore(
    (state) => state.activeOrganizationId,
  );
  const setActiveOrganizationId = useSessionStore(
    (state) => state.setActiveOrganizationId,
  );

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const organizationsQuery = useQuery({
    queryKey: queryKeys.organizations.list(),
    queryFn: () => organizationsApi.list(),
    staleTime: 60_000,
    retry: 1,
  });

  const activateOrganizationMutation = useMutation({
    mutationFn: async (organization: Organization) => {
      await organizationsApi.setActive(organization.id);
      return organization;
    },
    onSuccess: async (organization) => {
      setActiveOrganizationId(organization.id);
      await queryClient.invalidateQueries();
      toast.success(`Switched to ${organization.name}`);
      router.replace("/dashboard");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createOrganizationMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      const normalizedSlug = toSlug(slug);

      if (!trimmedName) {
        throw new Error("Organization name is required");
      }

      if (!normalizedSlug) {
        throw new Error("Organization slug is required");
      }

      const organization = await organizationsApi.create({
        name: trimmedName,
        slug: normalizedSlug,
      });

      await organizationsApi.setActive(organization.id);
      return organization;
    },
    onSuccess: async (organization) => {
      setActiveOrganizationId(organization.id);
      await queryClient.invalidateQueries();
      toast.success(`Organization ${organization.name} is ready`);
      router.replace("/dashboard");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (slugTouched) {
      return;
    }

    setSlug(toSlug(name));
  }, [name, slugTouched]);

  const organizations = organizationsQuery.data ?? [];
  const canSubmit =
    name.trim().length > 0 && toSlug(slug).length > 0 && !createOrganizationMutation.isPending;

  const selectedOrganizationName = useMemo(() => {
    if (!activeOrganizationId) {
      return null;
    }

    const selected = organizations.find(
      (organization) => organization.id === activeOrganizationId,
    );

    return selected?.name ?? null;
  }, [activeOrganizationId, organizations]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization setup"
        description={
          selectedOrganizationName
            ? `Current active organization: ${selectedOrganizationName}. You can switch or create additional organizations below.`
            : "Create or select an organization to activate your workspace."
        }
      />

      {selectedOrganizationName && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Active organization: <span className="font-medium text-foreground">{selectedOrganizationName}</span>
          </p>
        </div>
      )}

      {organizationsQuery.isError ? (
        <EmptyState
          icon={Building2}
          title="Could not load organizations"
          description="Try again, then create or select an organization."
          action={{
            label: "Retry",
            onClick: () => {
              void organizationsQuery.refetch();
            },
          }}
        />
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Select existing organization
            </h2>
            {organizationsQuery.isLoading ? (
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading organizations
              </div>
            ) : organizations.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No organization found for this account yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {organizations.map((organization) => (
                  <div
                    key={organization.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {organization.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {organization.slug}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={
                        organization.id === activeOrganizationId
                          ? "default"
                          : "outline"
                      }
                      onClick={() => activateOrganizationMutation.mutate(organization)}
                      disabled={
                        activateOrganizationMutation.isPending ||
                        organization.id === activeOrganizationId
                      }
                    >
                      {organization.id === activeOrganizationId ? "Active" : "Use"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Create new organization
            </h2>
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="organization-name">Organization name</Label>
                <Input
                  id="organization-name"
                  placeholder="Summit Build Group"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="organization-slug">Organization slug</Label>
                <Input
                  id="organization-slug"
                  placeholder="summit-build-group"
                  value={slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(toSlug(event.target.value));
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Used in URLs. Lowercase letters, numbers, and hyphens only.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => createOrganizationMutation.mutate()}
                  disabled={!canSubmit}
                >
                  {createOrganizationMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create and continue
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
