"use client";

import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  type PortalComplianceItem,
  portalApi,
} from "@/lib/api/modules/portal-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileWarning } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatPortalDateTime } from "../lib/portal-utils";

export function PortalCompliancePage() {
  const queryClient = useQueryClient();
  const [selectedComplianceId, setSelectedComplianceId] = useState("");
  const [form, setForm] = useState({
    evidence: "",
    notes: "",
  });

  const complianceQuery = useQuery({
    queryKey: queryKeys.portal.compliance(),
    queryFn: () => portalApi.getCompliance(),
  });

  const complianceItems = complianceQuery.data?.items ?? [];

  const selectedCompliance = useMemo(
    () => complianceItems.find((item) => item.id === selectedComplianceId),
    [complianceItems, selectedComplianceId],
  );

  useEffect(() => {
    if (complianceItems.length === 0) {
      return;
    }

    if (!selectedComplianceId) {
      setSelectedComplianceId(complianceItems[0]?.id ?? "");
    }
  }, [complianceItems, selectedComplianceId]);

  useEffect(() => {
    if (!selectedCompliance) {
      return;
    }

    setForm({
      evidence:
        typeof selectedCompliance.evidence?.value === "string"
          ? selectedCompliance.evidence.value
          : "",
      notes: selectedCompliance.notes ?? "",
    });
  }, [selectedCompliance]);

  const updateComplianceMutation = useMutation({
    mutationFn: () => {
      if (!selectedCompliance) {
        throw new Error("Select a compliance item first");
      }

      return portalApi.updateCompliance({
        complianceItemId: selectedCompliance.id,
        evidence: form.evidence.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Compliance evidence submitted for review");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.portal.compliance(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.portal.overview(),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Unable to update compliance item");
    },
  });

  const columns: DataTableColumn<PortalComplianceItem>[] = [
    {
      key: "complianceType",
      header: "Requirement",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.complianceType}</p>
          <p className="text-xs text-muted-foreground">{row.id}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "dueDate",
      header: "Due",
      render: (row) => formatPortalDateTime(row.dueDate),
    },
    {
      key: "risk",
      header: "Risk",
      render: (row) => (row.highRisk ? "High" : "Standard"),
    },
  ];

  if (complianceQuery.isLoading) {
    return <LoadingState title="Loading compliance requirements" rows={5} />;
  }

  if (complianceQuery.isError) {
    return (
      <ErrorState
        title="Unable to load compliance"
        description="Please refresh your session and retry."
        onRetry={() => {
          void complianceQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance"
        description="Upload required evidence and keep your subcontractor profile in good standing."
      />

      <div className="grid gap-4 lg:grid-cols-[1.35fr,1fr]">
        <DataTable
          columns={columns}
          data={complianceItems}
          rowKey={(row) => row.id}
          onRowClick={(row) => setSelectedComplianceId(row.id)}
          emptyState={
            <EmptyState
              icon={FileWarning}
              title="No compliance items"
              description="No compliance items have been assigned to this portal account yet."
              className="border-none"
            />
          }
        />

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Submit evidence
          </h2>

          {!selectedCompliance ? (
            <div className="mt-3">
              <EmptyState
                title="Select a compliance item"
                description="Choose a row on the left to upload evidence and notes."
              />
            </div>
          ) : (
            <div className="mt-3 space-y-4">
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
                <p className="font-medium text-foreground">
                  {selectedCompliance.complianceType}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <StatusBadge status={selectedCompliance.status} />
                  <span>
                    Due {formatPortalDateTime(selectedCompliance.dueDate)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="portal-compliance-evidence">Evidence</Label>
                <Input
                  id="portal-compliance-evidence"
                  value={form.evidence}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      evidence: event.target.value,
                    }))
                  }
                  placeholder="Paste file URL, storage key, or reference"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="portal-compliance-notes">Notes</Label>
                <textarea
                  id="portal-compliance-notes"
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={5}
                  className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Add context for your reviewer"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <Select
                  value={selectedCompliance.status}
                  disabled
                  className="w-40"
                  aria-label="Current status"
                >
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="expiring">Expiring</option>
                  <option value="expired">Expired</option>
                  <option value="compliant">Compliant</option>
                  <option value="non_compliant">Non-compliant</option>
                </Select>
                <Button
                  onClick={() => updateComplianceMutation.mutate()}
                  disabled={updateComplianceMutation.isPending}
                >
                  Submit update
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
