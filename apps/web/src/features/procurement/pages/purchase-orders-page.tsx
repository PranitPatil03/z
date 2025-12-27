"use client";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  type PurchaseOrder,
  purchaseOrdersApi,
} from "@/lib/api/modules/purchase-orders-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

function formatCents(c: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(c / 100);
}

export function PurchaseOrdersPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    projectId: "",
    poNumber: "",
    vendorName: "",
    totalAmountCents: "",
    issueDate: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.purchaseOrders.list(),
    queryFn: () => purchaseOrdersApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      purchaseOrdersApi.create({
        projectId: form.projectId,
        poNumber: form.poNumber,
        vendorName: form.vendorName,
        totalAmountCents: Math.round(
          Number.parseFloat(form.totalAmountCents) * 100,
        ),
        issueDate: form.issueDate || undefined,
      }),
    onSuccess: () => {
      toast.success("Purchase order created");
      qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      setDrawerOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: DataTableColumn<PurchaseOrder>[] = [
    {
      key: "po",
      header: "PO Number",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.poNumber}</p>
          <p className="text-xs text-muted-foreground">{row.vendorName}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "130px",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "amount",
      header: "Amount",
      width: "130px",
      render: (row) => (
        <span className="font-medium">{formatCents(row.totalAmountCents)}</span>
      ),
    },
    {
      key: "delivery",
      header: "Issued",
      width: "130px",
      render: (row) =>
        row.issueDate ? (
          <span className="text-muted-foreground">
            {new Date(row.issueDate).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Manage vendor purchase orders and delivery tracking."
        action={
          <Button size="sm" onClick={() => setDrawerOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New PO
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        rowKey={(r) => r.id}
        onRowClick={(row) => router.push(`/purchase-orders/${row.id}`)}
        emptyState={
          <EmptyState
            icon={ShoppingCart}
            title="No purchase orders"
            description="Create a PO to begin tracking vendor commitments."
            action={{ label: "New PO", onClick: () => setDrawerOpen(true) }}
          />
        }
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="New purchase order"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                createMutation.isPending ||
                !form.poNumber ||
                !form.vendorName ||
                !form.totalAmountCents
              }
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create PO
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Project ID *</Label>
            <Input
              placeholder="project-id"
              value={form.projectId}
              onChange={(e) =>
                setForm((f) => ({ ...f, projectId: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>PO number *</Label>
            <Input
              placeholder="PO-2024-001"
              value={form.poNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, poNumber: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Vendor name *</Label>
            <Input
              placeholder="Acme Contractors LLC"
              value={form.vendorName}
              onChange={(e) =>
                setForm((f) => ({ ...f, vendorName: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Total amount (USD) *</Label>
            <Input
              type="number"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={form.totalAmountCents}
              onChange={(e) =>
                setForm((f) => ({ ...f, totalAmountCents: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Issue date</Label>
            <Input
              type="date"
              value={form.issueDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, issueDate: e.target.value }))
              }
            />
          </div>
        </div>
      </FormDrawer>
    </div>
  );
}
