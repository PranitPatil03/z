"use client";

import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type Integration,
  type IntegrationStatus,
  integrationsApi,
} from "@/lib/api/modules/integrations-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, PlugZap, RefreshCw, Unplug } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function parseOptionalJson(input: string) {
  const value = input.trim();
  if (value.length === 0) {
    return undefined;
  }

  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Config must be a JSON object");
  }

  return parsed as Record<string, unknown>;
}

function toIsoOrUndefined(value: string) {
  if (value.trim().length === 0) {
    return undefined;
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  return new Date(value).toISOString();
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function IntegrationsPage() {
  const qc = useQueryClient();
  const [selectedIntegrationId, setSelectedIntegrationId] = useState("");

  const [createForm, setCreateForm] = useState({
    provider: "",
    name: "",
    configText: "",
  });

  const [updateForm, setUpdateForm] = useState({
    provider: "",
    name: "",
    status: "disconnected" as IntegrationStatus,
    lastSyncAt: "",
    configText: "",
  });

  const integrationsQuery = useQuery({
    queryKey: queryKeys.integrations.list(),
    queryFn: integrationsApi.list,
  });

  useEffect(() => {
    const firstId = integrationsQuery.data?.[0]?.id;
    if (!firstId) {
      setSelectedIntegrationId("");
      return;
    }

    const selectedExists = (integrationsQuery.data ?? []).some(
      (item) => item.id === selectedIntegrationId,
    );

    if (!selectedExists) {
      setSelectedIntegrationId(firstId);
    }
  }, [integrationsQuery.data, selectedIntegrationId]);

  const selectedIntegration = useMemo(
    () =>
      (integrationsQuery.data ?? []).find(
        (integration) => integration.id === selectedIntegrationId,
      ) ?? null,
    [integrationsQuery.data, selectedIntegrationId],
  );

  useEffect(() => {
    if (!selectedIntegration) {
      return;
    }

    setUpdateForm({
      provider: selectedIntegration.provider,
      name: selectedIntegration.name,
      status: selectedIntegration.status,
      lastSyncAt: selectedIntegration.lastSyncAt
        ? selectedIntegration.lastSyncAt.slice(0, 16)
        : "",
      configText: selectedIntegration.config
        ? JSON.stringify(selectedIntegration.config, null, 2)
        : "",
    });
  }, [selectedIntegration]);

  const createMutation = useMutation({
    mutationFn: () =>
      integrationsApi.create({
        provider: createForm.provider.trim(),
        name: createForm.name.trim(),
        config: parseOptionalJson(createForm.configText),
      }),
    onSuccess: (integration) => {
      toast.success("Integration created");
      setSelectedIntegrationId(integration.id);
      setCreateForm({ provider: "", name: "", configText: "" });
      void qc.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!selectedIntegrationId) {
        throw new Error("Select an integration first");
      }

      return integrationsApi.update(selectedIntegrationId, {
        provider: updateForm.provider.trim(),
        name: updateForm.name.trim(),
        status: updateForm.status,
        lastSyncAt: toIsoOrUndefined(updateForm.lastSyncAt),
        config: parseOptionalJson(updateForm.configText),
      });
    },
    onSuccess: () => {
      toast.success("Integration updated");
      void qc.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (integrationId: string) =>
      integrationsApi.disconnect(integrationId),
    onSuccess: () => {
      toast.success("Integration disconnected");
      void qc.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const integrationColumns: DataTableColumn<Integration>[] = [
    {
      key: "name",
      header: "Integration",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.provider}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "180px",
      render: (row) => (
        <div>
          <p className="text-sm text-foreground">{row.status}</p>
          <p className="text-xs text-muted-foreground">
            Last sync {formatDateTime(row.lastSyncAt)}
          </p>
        </div>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      width: "210px",
      render: (row) => (
        <p className="text-xs text-muted-foreground">
          {formatDateTime(row.updatedAt)}
        </p>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "130px",
      render: (row) => (
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive"
          onClick={(event) => {
            event.stopPropagation();
            disconnectMutation.mutate(row.id);
          }}
          disabled={disconnectMutation.isPending}
        >
          <Unplug className="mr-1.5 h-4 w-4" />
          Disconnect
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Manage provider connectors and keep sync health visible."
        action={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => integrationsQuery.refetch()}
              disabled={integrationsQuery.isFetching}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <Link href="/smartmail">
                <Link2 className="mr-1.5 h-4 w-4" />
                Back to SmartMail
              </Link>
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Create integration
          </h2>
          <div className="mt-3 grid gap-3">
            <Input
              placeholder="Provider (e.g. stripe, xero, netsuite)"
              value={createForm.provider}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  provider: event.target.value,
                }))
              }
            />
            <Input
              placeholder="Integration name"
              value={createForm.name}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
            <textarea
              className="flex min-h-[120px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
              placeholder="Config JSON (optional)"
              value={createForm.configText}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  configText: event.target.value,
                }))
              }
            />
            <div className="flex justify-end">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                <PlugZap className="mr-1.5 h-4 w-4" />
                Create integration
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Update selected integration
          </h2>
          {!selectedIntegration ? (
            <EmptyState
              title="No integration selected"
              description="Select an integration from the table to edit provider settings and status."
              className="border-none"
            />
          ) : (
            <div className="mt-3 grid gap-3">
              <p className="text-xs text-muted-foreground">
                {selectedIntegration.id}
              </p>
              <Input
                placeholder="Provider"
                value={updateForm.provider}
                onChange={(event) =>
                  setUpdateForm((current) => ({
                    ...current,
                    provider: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Integration name"
                value={updateForm.name}
                onChange={(event) =>
                  setUpdateForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
              <Select
                value={updateForm.status}
                onChange={(event) =>
                  setUpdateForm((current) => ({
                    ...current,
                    status: event.target.value as IntegrationStatus,
                  }))
                }
              >
                <option value="connected">connected</option>
                <option value="disconnected">disconnected</option>
                <option value="error">error</option>
              </Select>
              <div className="space-y-1.5">
                <Label htmlFor="integration-last-sync">Last sync at</Label>
                <Input
                  id="integration-last-sync"
                  type="datetime-local"
                  value={updateForm.lastSyncAt}
                  onChange={(event) =>
                    setUpdateForm((current) => ({
                      ...current,
                      lastSyncAt: event.target.value,
                    }))
                  }
                />
              </div>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                placeholder="Config JSON (optional)"
                value={updateForm.configText}
                onChange={(event) =>
                  setUpdateForm((current) => ({
                    ...current,
                    configText: event.target.value,
                  }))
                }
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    disconnectMutation.mutate(selectedIntegration.id)
                  }
                  disabled={disconnectMutation.isPending}
                >
                  Disconnect
                </Button>
                <Button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                >
                  Save integration
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Integrations</h2>
        {integrationsQuery.isLoading ? (
          <Skeleton className="h-28 w-full rounded-xl" />
        ) : (
          <DataTable
            columns={integrationColumns}
            data={integrationsQuery.data ?? []}
            rowKey={(row) => row.id}
            onRowClick={(row) => setSelectedIntegrationId(row.id)}
            emptyState={
              <EmptyState
                icon={PlugZap}
                title="No integrations"
                description="Create an integration to connect external systems."
                className="border-none"
              />
            }
          />
        )}
      </section>
    </div>
  );
}
