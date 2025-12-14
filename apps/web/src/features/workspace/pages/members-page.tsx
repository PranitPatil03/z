"use client";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import {
  type OrgMember,
  organizationsApi,
} from "@/lib/api/modules/organizations-api";
import { queryKeys } from "@/lib/api/query-keys";
import { authClient } from "@/lib/auth-client";
import { useSessionStore } from "@/store/session-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function MembersPage() {
  const qc = useQueryClient();
  const { data: session } = authClient.useSession();
  const activeOrgId = useSessionStore((s) => s.activeOrganizationId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");

  const sessionOrgId =
    session?.session && "activeOrganizationId" in session.session
      ? ((session.session as { activeOrganizationId?: string })
          .activeOrganizationId ?? null)
      : null;

  const orgId = activeOrgId ?? sessionOrgId ?? "";

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.organizations.members(orgId),
    queryFn: () => organizationsApi.listMembers(orgId),
    enabled: !!orgId,
  });

  const members = data ?? [];

  const inviteMutation = useMutation({
    mutationFn: () => organizationsApi.inviteMember(orgId, { email, role }),
    onSuccess: () => {
      toast.success(`Invite sent to ${email}`);
      qc.invalidateQueries({
        queryKey: queryKeys.organizations.members(orgId),
      });
      setDrawerOpen(false);
      setEmail("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: DataTableColumn<OrgMember>[] = [
    {
      key: "user",
      header: "Member",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {initials(row.user.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{row.user.name}</p>
            <p className="text-xs text-muted-foreground">{row.user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      width: "120px",
      render: (row) => (
        <Badge
          variant={row.role === "owner" ? "default" : "outline"}
          className="capitalize"
        >
          {row.role}
        </Badge>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      width: "140px",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.createdAt
            ? new Date(row.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team members"
        description="Manage who has access to this organization."
        action={
          <PermissionGuard permissionKey="organization.invitation.manage">
            <Button size="sm" onClick={() => setDrawerOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Invite member
            </Button>
          </PermissionGuard>
        }
      />

      <DataTable
        columns={columns}
        data={members}
        isLoading={isLoading}
        rowKey={(r) => r.id}
        emptyState={
          <EmptyState
            icon={Users}
            title="No members"
            description="Invite team members to collaborate."
            action={{
              label: "Invite member",
              onClick: () => setDrawerOpen(true),
            }}
          />
        }
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Invite member"
        description="Send an email invitation to join this organization."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending || !email}
            >
              {inviteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send invite
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email address *</Label>
            <Input
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "member")}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
        </div>
      </FormDrawer>
    </div>
  );
}
