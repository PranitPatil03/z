"use client";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Loader2, Plus, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const PRAVATAR_IMAGE_IDS = [
  1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 18, 19, 20, 21, 22, 23,
  24, 25, 26, 27, 28, 29, 31, 32, 33, 34, 36, 37, 39, 40, 41, 42, 44, 45,
  46, 47, 48, 49, 50, 51, 53, 54, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65,
  66, 67, 68, 69,
] as const;

const roleOrder: Record<OrgMember["role"], number> = {
  owner: 0,
  admin: 1,
  member: 2,
};

function hashSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getFallbackAvatarUrl(member: OrgMember) {
  if (member.user.image?.trim()) {
    return member.user.image;
  }

  const seed = `${member.user.id}:${member.user.email}`;
  const imageId = PRAVATAR_IMAGE_IDS[hashSeed(seed) % PRAVATAR_IMAGE_IDS.length];
  return `https://i.pravatar.cc/120?img=${imageId}`;
}

function formatJoinedDate(dateValue?: string) {
  if (!dateValue) {
    return "—";
  }

  return new Date(dateValue).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MembersPage() {
  const qc = useQueryClient();
  const { data: session } = authClient.useSession();
  const activeOrgId = useSessionStore((s) => s.activeOrganizationId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<
    "all" | "owner" | "admin" | "member"
  >("all");
  const [avatarLoadErrors, setAvatarLoadErrors] = useState<Record<string, true>>(
    {},
  );
  const normalizedEmail = email.trim();

  function openInviteDrawer() {
    setEmail("");
    setRole("member");
    setDrawerOpen(true);
  }

  function closeInviteDrawer() {
    setDrawerOpen(false);
  }

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

  const filteredMembers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return members
      .filter((member) => {
        const roleMatches = roleFilter === "all" || member.role === roleFilter;
        if (!roleMatches) {
          return false;
        }

        if (!query) {
          return true;
        }

        const haystack = `${member.user.name} ${member.user.email} ${member.role}`.toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => {
        const roleDelta = roleOrder[a.role] - roleOrder[b.role];
        if (roleDelta !== 0) {
          return roleDelta;
        }

        return a.user.name.localeCompare(b.user.name);
      });
  }, [members, roleFilter, searchTerm]);

  const isFiltered = roleFilter !== "all" || searchTerm.trim().length > 0;
  const adminsCount = members.filter((member) => member.role === "admin").length;
  const ownersCount = members.filter((member) => member.role === "owner").length;

  const inviteMutation = useMutation({
    mutationFn: () =>
      organizationsApi.inviteMember(orgId, { email: normalizedEmail, role }),
    onSuccess: () => {
      toast.success(`Invite sent to ${normalizedEmail}`);
      qc.invalidateQueries({
        queryKey: queryKeys.organizations.members(orgId),
      });
      setDrawerOpen(false);
      setEmail("");
      setRole("member");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: DataTableColumn<OrgMember>[] = [
    {
      key: "user",
      header: "Member",
      render: (row) => {
        const avatarUrl = getFallbackAvatarUrl(row);
        const showAvatarImage = !avatarLoadErrors[row.id];

        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              {showAvatarImage && (
                <AvatarImage
                  src={avatarUrl}
                  onError={() => {
                    setAvatarLoadErrors((current) => ({
                      ...current,
                      [row.id]: true,
                    }));
                  }}
                />
              )}
              <AvatarFallback className="text-xs">
                {initials(row.user.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{row.user.name}</p>
              <p className="text-xs text-muted-foreground">{row.user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      width: "120px",
      render: () => (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Active
        </span>
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
          {formatJoinedDate(row.createdAt)}
        </span>
      ),
    },
  ];

  const membersEmptyState = isFiltered ? (
    <EmptyState
      icon={Users}
      title="No matching members"
      description="Try a different search term or role filter."
    />
  ) : (
    <EmptyState
      icon={Users}
      title="No members"
      description="Invite team members to collaborate."
      action={{
        label: "Invite member",
        onClick: openInviteDrawer,
      }}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team members"
        description="Manage who has access to this organization."
        action={
          <PermissionGuard permissionKey="organization.invitation.manage">
            <Button size="sm" onClick={openInviteDrawer}>
              <Plus className="mr-1.5 h-4 w-4" />
              Invite member
            </Button>
          </PermissionGuard>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border/70 bg-card p-3">
          <p className="text-xs text-muted-foreground">Total members</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{members.length}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-card p-3">
          <p className="text-xs text-muted-foreground">Admins</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{adminsCount}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-card p-3">
          <p className="text-xs text-muted-foreground">Owners</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{ownersCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-[260px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-8"
              placeholder="Search member or email"
            />
          </div>
          <Select
            id="members-role-filter"
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(event.target.value as "all" | "owner" | "admin" | "member")
            }
            className="w-[170px]"
          >
            <option value="all">All roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          Showing {filteredMembers.length} of {members.length} members
        </p>
      </div>

      <DataTable
        columns={columns}
        data={filteredMembers}
        isLoading={isLoading}
        rowKey={(r) => r.id}
        emptyState={membersEmptyState}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeInviteDrawer}
        title="Invite member"
        description="Send an email invitation to join this organization."
        width="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeInviteDrawer}>
              Cancel
            </Button>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending || !normalizedEmail}
            >
              {inviteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send invite
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
            Invitations are sent immediately and grant access based on the role
            selected below.
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-member-email">Email address *</Label>
            <Input
              id="invite-member-email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-member-role">Role</Label>
            <Select
              id="invite-member-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "member")}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </Select>
            <p className="text-xs text-muted-foreground">
              Members can collaborate on day-to-day work. Admins can also manage
              organization settings.
            </p>
          </div>
        </div>
      </FormDrawer>
    </div>
  );
}
