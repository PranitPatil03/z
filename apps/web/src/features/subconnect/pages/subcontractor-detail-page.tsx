"use client";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-radix";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  formatDateTime,
  parseCommaSeparated,
} from "@/features/subconnect/lib/subconnect-utils";
import {
  type InviteSubcontractorPortalResult,
  type PortalInvitation,
  type SubcontractorStatus,
  subconnectApi,
} from "@/lib/api/modules/subconnect-api";
import { projectsApi } from "@/lib/api/modules/projects-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  Loader2,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type LifecycleModal = "none" | "edit" | "invite";

function parseMetadataText(input: string) {
  const value = input.trim();
  if (value.length === 0) return undefined;
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Metadata must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

interface SubcontractorDetailPageProps {
  subcontractorId: string;
}

export function SubcontractorDetailPage({
  subcontractorId,
}: SubcontractorDetailPageProps) {
  const queryClient = useQueryClient();
  const [activeModal, setActiveModal] = useState<LifecycleModal>("none");
  const [invitationStatusFilter, setInvitationStatusFilter] = useState<
    PortalInvitation["status"] | "all"
  >("all");
  const [lastInviteResult, setLastInviteResult] =
    useState<InviteSubcontractorPortalResult | null>(null);

  const [editForm, setEditForm] = useState({
    projectId: "",
    name: "",
    email: "",
    phone: "",
    trade: "",
    status: "active" as SubcontractorStatus,
    metadataText: "",
  });

  const [inviteForm, setInviteForm] = useState({
    email: "",
    projectId: "",
    temporaryPassword: "",
    assignedScope: "",
    milestonesText: "",
    sendInviteEmail: true,
  });

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => projectsApi.list(),
  });

  const subcontractorQuery = useQuery({
    queryKey: queryKeys.subcontractors.detail(subcontractorId),
    queryFn: () => subconnectApi.getSubcontractor(subcontractorId),
  });

  const invitationsQuery = useQuery({
    queryKey: queryKeys.subconnect.invitations({
      subcontractorId,
      status:
        invitationStatusFilter === "all" ? undefined : invitationStatusFilter,
      limit: 50,
    }),
    queryFn: () =>
      subconnectApi.listInvitations({
        subcontractorId,
        status:
          invitationStatusFilter === "all" ? undefined : invitationStatusFilter,
        limit: 50,
      }),
  });

  const subcontractor = subcontractorQuery.data ?? null;
  const projectOptions = projectsQuery.data ?? [];

  useEffect(() => {
    if (!subcontractor) return;
    setEditForm({
      projectId: subcontractor.projectId ?? "",
      name: subcontractor.name,
      email: subcontractor.email ?? "",
      phone: subcontractor.phone ?? "",
      trade: subcontractor.trade,
      status: subcontractor.status,
      metadataText: subcontractor.metadata
        ? JSON.stringify(subcontractor.metadata, null, 2)
        : "",
    });
    setInviteForm((current) => ({
      ...current,
      email: subcontractor.email ?? current.email,
      projectId: subcontractor.projectId ?? current.projectId,
    }));
  }, [subcontractor]);

  function refresh() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.subcontractors.all,
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.subconnect.all });
  }

  const updateMutation = useMutation({
    mutationFn: () =>
      subconnectApi.updateSubcontractor(subcontractorId, {
        projectId: editForm.projectId.trim() || undefined,
        name: editForm.name.trim(),
        email: editForm.email.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        trade: editForm.trade.trim(),
        status: editForm.status,
        metadata: parseMetadataText(editForm.metadataText),
      }),
    onSuccess: () => {
      toast.success("Subcontractor updated");
      setActiveModal("none");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      subconnectApi.inviteSubcontractorPortal(subcontractorId, {
        email: inviteForm.email.trim() || undefined,
        projectId: inviteForm.projectId.trim() || undefined,
        temporaryPassword: inviteForm.temporaryPassword.trim() || undefined,
        assignedScope: inviteForm.assignedScope.trim() || undefined,
        milestones: parseCommaSeparated(inviteForm.milestonesText),
        sendInviteEmail: inviteForm.sendInviteEmail,
      }),
    onSuccess: (result) => {
      toast.success("Portal invitation created");
      setLastInviteResult(result);
      setActiveModal("none");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const invitationColumns: DataTableColumn<PortalInvitation>[] = [
    {
      key: "email",
      header: "Invite",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.email}</p>
          <p className="text-xs text-muted-foreground">
            Project: {row.projectId ?? "—"}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "160px",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "invitedAt",
      header: "Invited",
      width: "190px",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(row.invitedAt)}
        </span>
      ),
    },
    {
      key: "acceptedAt",
      header: "Accepted",
      width: "190px",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.acceptedAt ? formatDateTime(row.acceptedAt) : "Not accepted"}
        </span>
      ),
    },
    {
      key: "expires",
      header: "Expires",
      width: "190px",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(row.expiresAt)}
        </span>
      ),
    },
  ];

  const subcontractorName =
    subcontractor?.name ?? subcontractorId;

  return (
    <div className="space-y-6">
      <PageHeader
        title={subcontractorName}
        description={
          subcontractor
            ? `${subcontractor.trade} · ${subcontractor.status}`
            : "Loading subcontractor details..."
        }
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={subcontractorQuery.isFetching || invitationsQuery.isFetching}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href="/subconnect"
          className="hover:text-foreground transition-colors"
        >
          SubConnect
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <Link
          href="/subconnect/subcontractors"
          className="hover:text-foreground transition-colors"
        >
          Subcontractors
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium text-foreground truncate max-w-[200px]">
          {subcontractorName}
        </span>
      </nav>

      {/* Subcontractor info card */}
      <section className="space-y-3 rounded-xl bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">
            Subcontractor information
          </h2>
          {subcontractor && <StatusBadge status={subcontractor.status} />}
        </div>

        {subcontractorQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : !subcontractor ? (
          <EmptyState
            title="Subcontractor not found"
            description={`No subcontractor found for ID: ${subcontractorId}`}
            className="rounded-lg"
          />
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
              <p className="text-sm font-medium text-foreground">
                {subcontractor.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                ID: {subcontractor.id}
              </p>

              <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                <p>
                  Organization:{" "}
                  <span className="text-foreground">
                    {subcontractor.organizationId}
                  </span>
                </p>
                <p>
                  Project:{" "}
                  <span className="text-foreground">
                    {subcontractor.projectId ?? "—"}
                  </span>
                </p>
                <p>
                  Trade:{" "}
                  <span className="text-foreground">{subcontractor.trade}</span>
                </p>
                <p>
                  Email:{" "}
                  <span className="text-foreground">
                    {subcontractor.email ?? "—"}
                  </span>
                </p>
                <p>
                  Phone:{" "}
                  <span className="text-foreground">
                    {subcontractor.phone ?? "—"}
                  </span>
                </p>
                <p>
                  Portal access:{" "}
                  <span className="text-foreground">
                    {subcontractor.portalEnabled ? "Enabled" : "Disabled"}
                  </span>
                </p>
                <p>
                  Created:{" "}
                  <span className="text-foreground">
                    {formatDateTime(subcontractor.createdAt)}
                  </span>
                </p>
                <p>
                  Updated:{" "}
                  <span className="text-foreground">
                    {formatDateTime(subcontractor.updatedAt)}
                  </span>
                </p>
              </div>

              {subcontractor.metadata &&
                Object.keys(subcontractor.metadata).length > 0 && (
                  <div className="mt-3 rounded-md border border-border/60 bg-card px-3 py-2">
                    <p className="text-xs font-medium text-foreground">
                      Metadata
                    </p>
                    <pre className="mt-1 overflow-x-auto text-xs text-muted-foreground">
                      {JSON.stringify(subcontractor.metadata, null, 2)}
                    </pre>
                  </div>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveModal("edit")}
              >
                Edit subcontractor
              </Button>
              <Button
                size="sm"
                onClick={() => setActiveModal("invite")}
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                Invite to portal
              </Button>
            </div>

            {lastInviteResult && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p>
                  Invite URL:{" "}
                  <a
                    href={lastInviteResult.inviteAcceptUrl}
                    className="text-primary underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open invite link
                  </a>
                </p>
                <p>Token: {lastInviteResult.inviteToken}</p>
                <p>
                  Email queued:{" "}
                  {lastInviteResult.inviteEmailQueued ? "yes" : "no"}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Invitation history */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">
            Invitation history
          </h2>
          <div className="w-full sm:w-44">
            <Select
              value={invitationStatusFilter}
              onValueChange={(value) =>
                setInvitationStatusFilter(
                  value as PortalInvitation["status"] | "all",
                )
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {invitationsQuery.isError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Failed to load invitation history.{" "}
            {(invitationsQuery.error as Error).message}
          </p>
        )}

        <DataTable
          columns={invitationColumns}
          data={invitationsQuery.data ?? []}
          isLoading={invitationsQuery.isLoading}
          rowKey={(row) => row.id}
          emptyState={
            <EmptyState
              icon={UserPlus}
              title="No invitations"
              description="Issue a portal invite to start the lifecycle."
            />
          }
        />
      </section>

      {/* Edit drawer */}
      <FormDrawer
        open={activeModal === "edit"}
        onClose={() => setActiveModal("none")}
        title="Edit subcontractor"
        description="Update profile details for this subcontractor."
        width="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setActiveModal("none")}>
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save subcontractor
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sub-edit-project-id">Project</Label>
            <Select
              value={editForm.projectId || "none"}
              onValueChange={(value) =>
                setEditForm((current) => ({
                  ...current,
                  projectId: value === "none" ? "" : value,
                }))
              }
            >
              <SelectTrigger id="sub-edit-project-id" className="h-10">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not assigned</SelectItem>
                {editForm.projectId &&
                  !projectOptions.some((p) => p.id === editForm.projectId) && (
                    <SelectItem value={editForm.projectId}>
                      Current: {editForm.projectId}
                    </SelectItem>
                  )}
                {projectOptions.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sub-edit-name">Name</Label>
            <Input
              id="sub-edit-name"
              placeholder="Subcontractor name"
              value={editForm.name}
              onChange={(e) =>
                setEditForm((c) => ({ ...c, name: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sub-edit-email">Email</Label>
            <Input
              id="sub-edit-email"
              placeholder="contact@vendor.com"
              value={editForm.email}
              onChange={(e) =>
                setEditForm((c) => ({ ...c, email: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sub-edit-phone">Phone</Label>
            <Input
              id="sub-edit-phone"
              placeholder="Phone number"
              value={editForm.phone}
              onChange={(e) =>
                setEditForm((c) => ({ ...c, phone: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sub-edit-trade">Trade</Label>
            <Input
              id="sub-edit-trade"
              placeholder="Trade"
              value={editForm.trade}
              onChange={(e) =>
                setEditForm((c) => ({ ...c, trade: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sub-edit-status">Status</Label>
            <Select
              value={editForm.status}
              onValueChange={(value) =>
                setEditForm((c) => ({
                  ...c,
                  status: value as SubcontractorStatus,
                }))
              }
            >
              <SelectTrigger id="sub-edit-status" className="h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="sub-edit-metadata">Metadata JSON</Label>
            <textarea
              id="sub-edit-metadata"
              className="flex min-h-[84px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
              placeholder="Optional JSON object"
              value={editForm.metadataText}
              onChange={(e) =>
                setEditForm((c) => ({ ...c, metadataText: e.target.value }))
              }
            />
          </div>
        </div>
      </FormDrawer>

      {/* Invite drawer */}
      <FormDrawer
        open={activeModal === "invite"}
        onClose={() => setActiveModal("none")}
        title="Invite to portal"
        description={
          subcontractor
            ? `Send portal access to ${subcontractor.name}`
            : "Send portal access to this subcontractor."
        }
        width="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setActiveModal("none")}>
              Cancel
            </Button>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send portal invite
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sub-invite-email">Invite email</Label>
            <Input
              id="sub-invite-email"
              placeholder="invite@vendor.com"
              value={inviteForm.email}
              onChange={(e) =>
                setInviteForm((c) => ({ ...c, email: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sub-invite-project">Project</Label>
            <Select
              value={inviteForm.projectId || "none"}
              onValueChange={(value) =>
                setInviteForm((c) => ({
                  ...c,
                  projectId: value === "none" ? "" : value,
                }))
              }
            >
              <SelectTrigger id="sub-invite-project" className="h-10">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Use subcontractor project</SelectItem>
                {inviteForm.projectId &&
                  !projectOptions.some((p) => p.id === inviteForm.projectId) && (
                    <SelectItem value={inviteForm.projectId}>
                      Current: {inviteForm.projectId}
                    </SelectItem>
                  )}
                {projectOptions.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sub-invite-password">Temporary password</Label>
            <Input
              id="sub-invite-password"
              placeholder="Optional"
              value={inviteForm.temporaryPassword}
              onChange={(e) =>
                setInviteForm((c) => ({
                  ...c,
                  temporaryPassword: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sub-invite-scope">Assigned scope</Label>
            <Input
              id="sub-invite-scope"
              placeholder="Assigned scope"
              value={inviteForm.assignedScope}
              onChange={(e) =>
                setInviteForm((c) => ({ ...c, assignedScope: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="sub-invite-milestones">Milestones</Label>
            <Input
              id="sub-invite-milestones"
              placeholder="Comma-separated milestones"
              value={inviteForm.milestonesText}
              onChange={(e) =>
                setInviteForm((c) => ({
                  ...c,
                  milestonesText: e.target.value,
                }))
              }
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground md:col-span-2">
            <input
              type="checkbox"
              checked={inviteForm.sendInviteEmail}
              onChange={(e) =>
                setInviteForm((c) => ({
                  ...c,
                  sendInviteEmail: e.target.checked,
                }))
              }
            />
            Send invite email
          </label>
        </div>
      </FormDrawer>
    </div>
  );
}
