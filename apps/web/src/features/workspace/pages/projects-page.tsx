"use client";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { usePermissionCheck } from "@/features/auth/hooks/use-permission-check";
import {
  type CreateProjectFormValues,
  createProjectFormSchema,
} from "@/features/workspace/lib/workspace-forms";
import { type Project, projectsApi } from "@/lib/api/modules/projects-api";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, LayoutGrid, List, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProjectsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [projectView, setProjectView] = useState<"cards" | "list">("cards");
  const [form, setForm] = useState<CreateProjectFormValues>({
    name: "",
    code: "",
    description: "",
  });
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof CreateProjectFormValues | "form", string>>
  >({});

  const { data: canRead, isLoading: canReadLoading } =
    usePermissionCheck("project.read");

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => projectsApi.list(),
    enabled: canRead !== false,
  });

  const createMutation = useMutation({
    mutationFn: (body: CreateProjectFormValues) => projectsApi.create(body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: queryKeys.projects.all });
      const previous = qc.getQueryData<Project[]>(queryKeys.projects.list());

      const optimisticProject: Project = {
        id: `temp-${crypto.randomUUID()}`,
        organizationId: "optimistic",
        name: body.name,
        code: body.code,
        description: body.description,
        status: "active",
        startDate: null,
        endDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      qc.setQueryData<Project[]>(queryKeys.projects.list(), (current) => [
        optimisticProject,
        ...(current ?? []),
      ]);

      return { previous };
    },
    onError: (error: Error, _input, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.projects.list(), context.previous);
      }
      qc.invalidateQueries({ queryKey: queryKeys.projects.all });
      setFormErrors({ form: error.message });
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Project created");
      setDrawerOpen(false);
      setForm({ name: "", code: "", description: "" });
      setFormErrors({});
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (projectId: string) => projectsApi.archive(projectId),
    onSuccess: () => {
      toast.success("Project archived");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });

  const rows = projectsQuery.data ?? [];

  const projectsEmptyState = (
    <EmptyState
      icon={FolderOpen}
      title="No projects yet"
      description="Create your first project to start tracking work."
      action={{
        label: "New project",
        onClick: () => setDrawerOpen(true),
      }}
    />
  );

  const columns: DataTableColumn<Project>[] = [
    {
      key: "name",
      header: "Project",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.code}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "140px",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "description",
      header: "Description",
      render: (row) => (
        <span className="line-clamp-1 text-muted-foreground">
          {row.description || "—"}
        </span>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      width: "130px",
      render: (row) => (
        <span className="text-muted-foreground">
          {formatDate(row.updatedAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "120px",
      render: (row) => (
        <div className="flex items-center justify-end">
          <PermissionGuard permissionKey="project.archive" projectId={row.id}>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground"
              onClick={(event) => {
                event.stopPropagation();
                archiveMutation.mutate(row.id);
              }}
              disabled={archiveMutation.isPending || row.status === "archived"}
              title="Archive project"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  const handleSubmit = () => {
    const parsed = createProjectFormSchema.safeParse({
      name: form.name,
      code: form.code,
      description: form.description,
    });

    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof CreateProjectFormValues, string>> =
        {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof CreateProjectFormValues;
        if (!nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setFormErrors(nextErrors);
      return;
    }

    setFormErrors({});
    createMutation.mutate(parsed.data);
  };

  if (!canReadLoading && canRead === false) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Projects"
          description="Manage active construction projects in your organization."
        />
        <EmptyState
          icon={FolderOpen}
          title="Access restricted"
          description="You do not have permission to view projects in this organization."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Manage active construction projects in your organization."
        action={
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-md border border-border bg-muted/30 p-0.5">
              <Button
                type="button"
                size="sm"
                variant={projectView === "cards" ? "secondary" : "ghost"}
                className={cn(
                  "h-8 px-2",
                  projectView === "cards"
                    ? "bg-card shadow-sm"
                    : "text-muted-foreground",
                )}
                onClick={() => setProjectView("cards")}
                aria-label="Card view"
                title="Card view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant={projectView === "list" ? "secondary" : "ghost"}
                className={cn(
                  "h-8 px-2",
                  projectView === "list"
                    ? "bg-card shadow-sm"
                    : "text-muted-foreground",
                )}
                onClick={() => setProjectView("list")}
                aria-label="List view"
                title="List view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <PermissionGuard
              permissionKey="project.create"
              fallback={
                <Button size="sm" disabled>
                  <Plus className="mr-1.5 h-4 w-4" />
                  New project
                </Button>
              }
            >
              <Button size="sm" onClick={() => setDrawerOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                New project
              </Button>
            </PermissionGuard>
          </div>
        }
      />

      {projectView === "cards" ? (
        projectsQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        ) : rows.length === 0 ? (
          projectsEmptyState
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((project) => (
              <article
                key={project.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/projects/${project.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/projects/${project.id}`);
                  }
                }}
                className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-foreground">
                      {project.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {project.code}
                    </p>
                  </div>
                  <PermissionGuard
                    permissionKey="project.archive"
                    projectId={project.id}
                  >
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={(event) => {
                        event.stopPropagation();
                        archiveMutation.mutate(project.id);
                      }}
                      disabled={
                        archiveMutation.isPending || project.status === "archived"
                      }
                      title="Archive project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </PermissionGuard>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <StatusBadge status={project.status} />
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDate(project.updatedAt)}
                  </p>
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                  {project.description || "No description provided."}
                </p>
              </article>
            ))}
          </div>
        )
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={projectsQuery.isLoading}
          rowKey={(r) => r.id}
          onRowClick={(row) => router.push(`/projects/${row.id}`)}
          emptyState={projectsEmptyState}
        />
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setFormErrors({});
        }}
        title="Create project"
        description="Add a new project to your workspace."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create project
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Project name *</Label>
            <Input
              id="project-name"
              placeholder="e.g. Harbor Bridge Renovation"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            {formErrors.name && (
              <p className="text-xs text-destructive">{formErrors.name}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-code">Project code *</Label>
            <Input
              id="project-code"
              placeholder="e.g. HBR-001"
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
              }
            />
            {formErrors.code && (
              <p className="text-xs text-destructive">{formErrors.code}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-description">Description</Label>
            <Input
              id="project-description"
              placeholder="Brief description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
            {formErrors.description && (
              <p className="text-xs text-destructive">
                {formErrors.description}
              </p>
            )}
          </div>
          {formErrors.form && (
            <p className="text-xs text-destructive">{formErrors.form}</p>
          )}
        </div>
      </FormDrawer>
    </div>
  );
}
