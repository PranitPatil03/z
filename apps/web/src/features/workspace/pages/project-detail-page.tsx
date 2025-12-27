"use client";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { usePermissionCheck } from "@/features/auth/hooks/use-permission-check";
import {
  type ProjectMemberFormValues,
  type UpdateProjectFormValues,
  projectMemberFormSchema,
  removeProjectMemberByUserId,
  updateProjectFormSchema,
  upsertProjectMember,
} from "@/features/workspace/lib/workspace-forms";
import {
  type OrgMember,
  organizationsApi,
} from "@/lib/api/modules/organizations-api";
import {
  type Project,
  type ProjectMember,
  projectsApi,
} from "@/lib/api/modules/projects-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useSessionStore } from "@/store/session-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface ProjectDetailPageProps {
  projectId: string;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function memberDisplayName(member: ProjectMember | OrgMember) {
  if (member.user?.name) {
    return member.user.name;
  }

  return member.user?.email ?? member.userId;
}

export function ProjectDetailPage({ projectId }: ProjectDetailPageProps) {
  const qc = useQueryClient();
  const activeOrganizationId = useSessionStore(
    (state) => state.activeOrganizationId,
  );
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [memberDrawerOpen, setMemberDrawerOpen] = useState(false);
  const [editForm, setEditForm] = useState<UpdateProjectFormValues>({
    name: "",
    code: "",
    description: "",
  });
  const [editErrors, setEditErrors] = useState<
    Partial<Record<keyof UpdateProjectFormValues | "form", string>>
  >({});
  const [memberForm, setMemberForm] = useState<
    ProjectMemberFormValues & { departmentIdsText: string }
  >({
    userId: "",
    role: "viewer",
    departmentIds: [],
    departmentIdsText: "",
  });
  const [memberFormError, setMemberFormError] = useState<string | null>(null);

  const { data: canRead, isLoading: canReadLoading } = usePermissionCheck(
    "project.read",
    projectId,
  );
  const { data: canManageMembers } = usePermissionCheck(
    "project.member.manage",
    projectId,
  );

  const projectQuery = useQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: () => projectsApi.get(projectId),
    enabled: canRead !== false,
  });

  const projectMembersQuery = useQuery({
    queryKey: queryKeys.projects.members(projectId),
    queryFn: () => projectsApi.listMembers(projectId),
    enabled: canRead !== false,
  });

  const orgMembersQuery = useQuery({
    queryKey: queryKeys.organizations.members(activeOrganizationId ?? ""),
    queryFn: () => organizationsApi.listMembers(activeOrganizationId ?? ""),
    enabled: Boolean(activeOrganizationId),
  });

  const project = projectQuery.data;
  const projectMembers = projectMembersQuery.data ?? [];
  const orgMembers = orgMembersQuery.data ?? [];

  useEffect(() => {
    if (!project) {
      return;
    }

    setEditForm({
      name: project.name,
      code: project.code,
      description: project.description ?? "",
    });
  }, [project]);

  const availableOrgMembers = useMemo(() => {
    const assignedUserIds = new Set(
      projectMembers.map((member) => member.userId),
    );
    return orgMembers.filter((member) => !assignedUserIds.has(member.userId));
  }, [orgMembers, projectMembers]);

  const updateProjectMutation = useMutation({
    mutationFn: (body: UpdateProjectFormValues) =>
      projectsApi.update(projectId, body),
    onMutate: async (body) => {
      await qc.cancelQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });
      await qc.cancelQueries({ queryKey: queryKeys.projects.list() });

      const previousProject = qc.getQueryData<Project>(
        queryKeys.projects.detail(projectId),
      );
      const previousProjects = qc.getQueryData<Project[]>(
        queryKeys.projects.list(),
      );

      if (previousProject) {
        qc.setQueryData<Project>(queryKeys.projects.detail(projectId), {
          ...previousProject,
          ...body,
          updatedAt: new Date().toISOString(),
        });
      }

      if (previousProjects) {
        qc.setQueryData<Project[]>(
          queryKeys.projects.list(),
          previousProjects.map((item) =>
            item.id === projectId
              ? { ...item, ...body, updatedAt: new Date().toISOString() }
              : item,
          ),
        );
      }

      return { previousProject, previousProjects };
    },
    onError: (error: Error, _body, context) => {
      if (context?.previousProject) {
        qc.setQueryData(
          queryKeys.projects.detail(projectId),
          context.previousProject,
        );
      }
      if (context?.previousProjects) {
        qc.setQueryData(queryKeys.projects.list(), context.previousProjects);
      }
      qc.invalidateQueries({ queryKey: queryKeys.projects.all });
      setEditErrors({ form: error.message });
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Project updated");
      setEditDrawerOpen(false);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (body: ProjectMemberFormValues) =>
      projectsApi.addMember(projectId, body),
    onMutate: async (body) => {
      await qc.cancelQueries({
        queryKey: queryKeys.projects.members(projectId),
      });
      const previousMembers = qc.getQueryData<ProjectMember[]>(
        queryKeys.projects.members(projectId),
      );

      const selectedOrgMember = orgMembers.find(
        (member) => member.userId === body.userId,
      );
      const optimisticMember: ProjectMember = {
        id: `temp-${crypto.randomUUID()}`,
        organizationId: activeOrganizationId ?? "optimistic",
        projectId,
        userId: body.userId,
        role: body.role,
        departmentIds: body.departmentIds,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: selectedOrgMember?.user ?? {
          id: body.userId,
          name: body.userId,
          email: "",
        },
      };

      qc.setQueryData<ProjectMember[]>(
        queryKeys.projects.members(projectId),
        (current) => upsertProjectMember(current ?? [], optimisticMember),
      );

      return { previousMembers };
    },
    onError: (error: Error, _body, context) => {
      if (context?.previousMembers) {
        qc.setQueryData(
          queryKeys.projects.members(projectId),
          context.previousMembers,
        );
      }
      qc.invalidateQueries({ queryKey: queryKeys.projects.members(projectId) });
      setMemberFormError(error.message);
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Member added to project");
      setMemberDrawerOpen(false);
      setMemberForm({
        userId: "",
        role: "viewer",
        departmentIds: [],
        departmentIdsText: "",
      });
      setMemberFormError(null);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.members(projectId) });
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: ({
      userId,
      role,
    }: { userId: string; role: ProjectMember["role"] }) =>
      projectsApi.updateMember(projectId, userId, { role }),
    onMutate: async ({ userId, role }) => {
      await qc.cancelQueries({
        queryKey: queryKeys.projects.members(projectId),
      });
      const previousMembers = qc.getQueryData<ProjectMember[]>(
        queryKeys.projects.members(projectId),
      );

      qc.setQueryData<ProjectMember[]>(
        queryKeys.projects.members(projectId),
        (current) =>
          (current ?? []).map((member) =>
            member.userId === userId
              ? { ...member, role, updatedAt: new Date().toISOString() }
              : member,
          ),
      );

      return { previousMembers };
    },
    onError: (error: Error, _payload, context) => {
      if (context?.previousMembers) {
        qc.setQueryData(
          queryKeys.projects.members(projectId),
          context.previousMembers,
        );
      }
      qc.invalidateQueries({ queryKey: queryKeys.projects.members(projectId) });
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Member role updated");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.members(projectId) });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => projectsApi.removeMember(projectId, userId),
    onMutate: async (userId) => {
      await qc.cancelQueries({
        queryKey: queryKeys.projects.members(projectId),
      });
      const previousMembers = qc.getQueryData<ProjectMember[]>(
        queryKeys.projects.members(projectId),
      );

      qc.setQueryData<ProjectMember[]>(
        queryKeys.projects.members(projectId),
        (current) => removeProjectMemberByUserId(current ?? [], userId),
      );

      return { previousMembers };
    },
    onError: (error: Error, _userId, context) => {
      if (context?.previousMembers) {
        qc.setQueryData(
          queryKeys.projects.members(projectId),
          context.previousMembers,
        );
      }
      qc.invalidateQueries({ queryKey: queryKeys.projects.members(projectId) });
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Member removed from project");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.members(projectId) });
    },
  });

  const projectMemberColumns: DataTableColumn<ProjectMember>[] = [
    {
      key: "member",
      header: "Member",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">
            {memberDisplayName(row)}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.user?.email || row.userId}
          </p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      width: "180px",
      render: (row) =>
        canManageMembers ? (
          <Select
            value={row.role}
            onChange={(event) =>
              updateMemberRoleMutation.mutate({
                userId: row.userId,
                role: event.target.value as ProjectMember["role"],
              })
            }
            className="h-8"
            disabled={updateMemberRoleMutation.isPending}
          >
            <option value="pm">PM</option>
            <option value="field_supervisor">Field Supervisor</option>
            <option value="viewer">Viewer</option>
          </Select>
        ) : (
          <span className="capitalize text-muted-foreground">
            {row.role.replace(/_/g, " ")}
          </span>
        ),
    },
    {
      key: "departments",
      header: "Departments",
      render: (row) => (
        <span className="text-muted-foreground">
          {row.departmentIds.length > 0 ? row.departmentIds.join(", ") : "All"}
        </span>
      ),
    },
    {
      key: "added",
      header: "Added",
      width: "130px",
      render: (row) => (
        <span className="text-muted-foreground">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "90px",
      render: (row) =>
        canManageMembers ? (
          <div className="flex justify-end">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground"
              title="Remove member"
              disabled={removeMemberMutation.isPending}
              onClick={() => removeMemberMutation.mutate(row.userId)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <span />
        ),
    },
  ];

  const handleProjectUpdate = () => {
    const parsed = updateProjectFormSchema.safeParse(editForm);

    if (!parsed.success) {
      const nextErrors: Partial<
        Record<keyof UpdateProjectFormValues | "form", string>
      > = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as keyof UpdateProjectFormValues | undefined;
        if (path && !nextErrors[path]) {
          nextErrors[path] = issue.message;
        }
        if (!path && !nextErrors.form) {
          nextErrors.form = issue.message;
        }
      }
      setEditErrors(nextErrors);
      return;
    }

    setEditErrors({});
    updateProjectMutation.mutate(parsed.data);
  };

  const handleAddMember = () => {
    const parsed = projectMemberFormSchema.safeParse({
      userId: memberForm.userId,
      role: memberForm.role,
      departmentIds: memberForm.departmentIdsText
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      setMemberFormError(
        firstIssue?.message ?? "Please verify the member form",
      );
      return;
    }

    setMemberFormError(null);
    addMemberMutation.mutate(parsed.data);
  };

  if (!canReadLoading && canRead === false) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Project"
          description="You do not have permission to view this project."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/projects">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to projects
              </Link>
            </Button>
          }
        />
        <EmptyState
          icon={Users}
          title="Access restricted"
          description="Ask an administrator for project.read permission."
        />
      </div>
    );
  }

  if (!project && projectQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Project" description="Loading project details..." />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Project"
          description="The project was not found or you no longer have access."
        />
        <Button asChild variant="outline" size="sm">
          <Link href="/projects">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to projects
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={`Project code: ${project.code}`}
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/projects">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back
              </Link>
            </Button>
            <PermissionGuard
              permissionKey="project.update"
              projectId={projectId}
            >
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditDrawerOpen(true)}
              >
                <Pencil className="mr-1.5 h-4 w-4" />
                Edit project
              </Button>
            </PermissionGuard>
            <PermissionGuard
              permissionKey="project.member.manage"
              projectId={projectId}
            >
              <Button size="sm" onClick={() => setMemberDrawerOpen(true)}>
                <UserPlus className="mr-1.5 h-4 w-4" />
                Add member
              </Button>
            </PermissionGuard>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="mt-2">
            <StatusBadge status={project.status} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Created</p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {formatDate(project.createdAt)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Updated</p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {formatDate(project.updatedAt)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Description</p>
          <p className="mt-2 line-clamp-2 text-sm text-foreground">
            {project.description || "No description"}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          Project members
        </h2>
        <DataTable
          columns={projectMemberColumns}
          data={projectMembers}
          isLoading={projectMembersQuery.isLoading}
          rowKey={(row) => row.id}
          emptyState={
            <EmptyState
              icon={Users}
              title="No project members"
              description="Add organization members to grant project access."
              action={{
                label: "Add member",
                onClick: () => setMemberDrawerOpen(true),
              }}
            />
          }
        />
      </section>

      <FormDrawer
        open={editDrawerOpen}
        onClose={() => {
          setEditDrawerOpen(false);
          setEditErrors({});
        }}
        title="Edit project"
        description="Update project metadata and identifiers."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleProjectUpdate}
              disabled={updateProjectMutation.isPending}
            >
              {updateProjectMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save changes
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Project name</Label>
            <Input
              id="edit-name"
              value={editForm.name ?? ""}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
            {editErrors.name && (
              <p className="text-xs text-destructive">{editErrors.name}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-code">Project code</Label>
            <Input
              id="edit-code"
              value={editForm.code ?? ""}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  code: event.target.value.toUpperCase(),
                }))
              }
            />
            {editErrors.code && (
              <p className="text-xs text-destructive">{editErrors.code}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-description">Description</Label>
            <Input
              id="edit-description"
              value={editForm.description ?? ""}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
            {editErrors.description && (
              <p className="text-xs text-destructive">
                {editErrors.description}
              </p>
            )}
          </div>
          {editErrors.form && (
            <p className="text-xs text-destructive">{editErrors.form}</p>
          )}
        </div>
      </FormDrawer>

      <FormDrawer
        open={memberDrawerOpen}
        onClose={() => {
          setMemberDrawerOpen(false);
          setMemberFormError(null);
        }}
        title="Add project member"
        description="Assign an organization member to this project."
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setMemberDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={
                addMemberMutation.isPending || availableOrgMembers.length === 0
              }
            >
              {addMemberMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add member
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="member-user">Organization member</Label>
            <Select
              id="member-user"
              value={memberForm.userId}
              onChange={(event) =>
                setMemberForm((current) => ({
                  ...current,
                  userId: event.target.value,
                }))
              }
              placeholder="Select a member"
            >
              {availableOrgMembers.map((member) => (
                <option key={member.id} value={member.userId}>
                  {memberDisplayName(member)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="member-role">Project role</Label>
            <Select
              id="member-role"
              value={memberForm.role}
              onChange={(event) =>
                setMemberForm((current) => ({
                  ...current,
                  role: event.target.value as ProjectMember["role"],
                }))
              }
            >
              <option value="pm">PM</option>
              <option value="field_supervisor">Field Supervisor</option>
              <option value="viewer">Viewer</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="member-departments">
              Department IDs (comma-separated)
            </Label>
            <Input
              id="member-departments"
              placeholder="dept-1, dept-2"
              value={memberForm.departmentIdsText}
              onChange={(event) =>
                setMemberForm((current) => ({
                  ...current,
                  departmentIdsText: event.target.value,
                }))
              }
            />
          </div>
          {availableOrgMembers.length === 0 && (
            <p className="text-xs text-muted-foreground">
              All organization members are already assigned to this project.
            </p>
          )}
          {memberFormError && (
            <p className="text-xs text-destructive">{memberFormError}</p>
          )}
        </div>
      </FormDrawer>
    </div>
  );
}
