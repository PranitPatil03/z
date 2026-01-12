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
  parseImageUrlInput,
  resolveSiteSnapJobUiState,
} from "@/features/sitesnap/lib/sitesnap-utils";
import { projectsApi } from "@/lib/api/modules/projects-api";
import { type SiteSnap, siteSnapsApi } from "@/lib/api/modules/sitesnaps-api";
import { storageApi } from "@/lib/api/modules/storage-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function SiteSnapPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draftEntityId, setDraftEntityId] = useState(
    `site-snap-draft-${crypto.randomUUID()}`,
  );
  const [uploadedDraftAssets, setUploadedDraftAssets] = useState<
    Array<{ fileAssetId: string; fileName: string }>
  >([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    projectId: "",
    notes: "",
    locationZone: "",
    imageUrlsInput: "",
  });

  const normalizedProjectId = projectId.trim();

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => projectsApi.list(),
  });

  const projectOptions = projectsQuery.data ?? [];

  useEffect(() => {
    if (projectId || projectOptions.length === 0) {
      return;
    }

    const defaultProjectId = projectOptions[0]?.id ?? "";
    if (!defaultProjectId) {
      return;
    }

    setProjectId(defaultProjectId);
  }, [projectId, projectOptions]);

  const listQuery = useQuery({
    queryKey: queryKeys.siteSnaps.list({ projectId: normalizedProjectId }),
    queryFn: () => siteSnapsApi.list(normalizedProjectId),
    enabled: normalizedProjectId.length > 0,
  });

  const dailyProgressQuery = useQuery({
    queryKey: queryKeys.siteSnaps.dailyProgress(normalizedProjectId),
    queryFn: () => siteSnapsApi.dailyProgress(normalizedProjectId),
    enabled: normalizedProjectId.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      siteSnapsApi.create({
        projectId: form.projectId.trim(),
        notes: form.notes.trim(),
        locationZone: form.locationZone.trim(),
        imageUrls: parseImageUrlInput(form.imageUrlsInput),
        imageFileAssetIds: uploadedDraftAssets.map(
          (asset) => asset.fileAssetId,
        ),
      }),
    onSuccess: () => {
      toast.success("Snap created");
      qc.invalidateQueries({ queryKey: queryKeys.siteSnaps.all });
      setProjectId(form.projectId.trim());
      setUploadedDraftAssets([]);
      setCreateError(null);
      setForm({
        projectId: form.projectId.trim(),
        notes: "",
        locationZone: "",
        imageUrlsInput: "",
      });
      setDrawerOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadDraftAssetMutation = useMutation({
    mutationFn: async (file: File) => {
      const normalizedFormProjectId = form.projectId.trim();
      if (!normalizedFormProjectId) {
        throw new Error("Project ID is required before uploading");
      }

      const session = await storageApi.createUploadSession({
        projectId: normalizedFormProjectId,
        entityType: "site_snap_draft",
        entityId: draftEntityId,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });

      const uploadResult = await storageApi.uploadToSignedUrl(
        session.uploadUrl,
        file,
        session.requiredHeaders,
      );

      await storageApi.completeUpload(session.fileAssetId, {
        eTag: uploadResult.eTag,
      });

      return {
        fileAssetId: session.fileAssetId,
        fileName: file.name,
      };
    },
    onSuccess: (asset) => {
      setUploadedDraftAssets((current) => [asset, ...current]);
      toast.success(`Uploaded ${asset.fileName}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: (payload: { siteSnapId: string; reanalyze?: boolean }) =>
      payload.reanalyze
        ? siteSnapsApi.reanalyze(payload.siteSnapId)
        : siteSnapsApi.analyze(payload.siteSnapId),
    onSuccess: () => {
      toast.success("Analysis queued");
      qc.invalidateQueries({ queryKey: queryKeys.siteSnaps.all });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviewMutation = useMutation({
    mutationFn: (siteSnapId: string) => siteSnapsApi.review(siteSnapId),
    onSuccess: () => {
      toast.success("Site snap reviewed");
      qc.invalidateQueries({ queryKey: queryKeys.siteSnaps.all });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function handleDraftUploads(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    for (const file of Array.from(files)) {
      await uploadDraftAssetMutation.mutateAsync(file);
    }
  }

  function openCreateDrawer() {
    const defaultProjectId = normalizedProjectId || projectOptions[0]?.id || "";
    setDrawerOpen(true);
    setDraftEntityId(`site-snap-draft-${crypto.randomUUID()}`);
    setUploadedDraftAssets([]);
    setCreateError(null);
    setForm({
      projectId: defaultProjectId,
      notes: "",
      locationZone: "",
      imageUrlsInput: "",
    });
  }

  function createSiteSnap() {
    if (
      !form.projectId.trim() ||
      !form.notes.trim() ||
      !form.locationZone.trim()
    ) {
      setCreateError("Project ID, notes, and location zone are required");
      return;
    }

    const externalUrls = parseImageUrlInput(form.imageUrlsInput);
    if (externalUrls.length === 0 && uploadedDraftAssets.length === 0) {
      setCreateError("Add at least one image URL or upload at least one image");
      return;
    }

    setCreateError(null);
    createMutation.mutate();
  }

  const columns: DataTableColumn<SiteSnap>[] = [
    {
      key: "snap",
      header: "Snap",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Camera className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="line-clamp-1 font-medium text-foreground">
              {row.notes}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {row.locationZone}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "210px",
      render: (row) => {
        const jobUiState = resolveSiteSnapJobUiState({
          analysisState: row.analysisState,
        });
        return (
          <div>
            <StatusBadge status={row.status} />
            <p className="mt-1 text-xs text-muted-foreground">
              {jobUiState.label}
            </p>
          </div>
        );
      },
    },
    {
      key: "date",
      header: "Captured",
      width: "130px",
      render: (row) => (
        <span className="text-muted-foreground">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "240px",
      render: (row) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={(event) => {
              event.stopPropagation();
              analyzeMutation.mutate({
                siteSnapId: row.id,
                reanalyze: row.status === "analyzing",
              });
            }}
            disabled={analyzeMutation.isPending}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            {row.status === "analyzing" ? "Reanalyze" : "Analyze"}
          </Button>
          {row.status !== "reviewed" && (
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={(event) => {
                event.stopPropagation();
                reviewMutation.mutate(row.id);
              }}
              disabled={reviewMutation.isPending}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Review
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="SiteSnap AI"
        description="Capture field photos and get AI-powered site observations."
        action={
          <Button size="sm" onClick={openCreateDrawer}>
            <Plus className="mr-1.5 h-4 w-4" />
            New snap
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_auto]">
        <div className="min-w-0">
          <Select
            value={projectId || undefined}
            onValueChange={(value) => setProjectId(value)}
          >
            <SelectTrigger className="h-10">
              <SelectValue
                placeholder={
                  projectsQuery.isLoading ? "Loading projects..." : "Select project"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {projectId &&
                !projectOptions.some((project) => project.id === projectId) && (
                  <SelectItem value={projectId}>Current: {projectId}</SelectItem>
                )}
              {projectOptions.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.code} - {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          className="h-10 w-full md:w-auto"
          onClick={() => {
            void listQuery.refetch();
            void dailyProgressQuery.refetch();
          }}
          disabled={normalizedProjectId.length === 0}
        >
          Refresh
        </Button>
        {dailyProgressQuery.data ? (
          <div className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground md:col-span-2">
            {dailyProgressQuery.data.snapCount} snaps, {" "}
            {dailyProgressQuery.data.reviewedCount} reviewed, {" "}
            {dailyProgressQuery.data.observationCount} observations today
          </div>
        ) : (
          <div className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground md:col-span-2">
            Daily progress appears after selecting a project.
          </div>
        )}
      </div>

      {normalizedProjectId.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="Project scope required"
          description="Select a project to load SiteSnap records."
        />
      ) : (
        <DataTable
          className="w-full [&_table]:w-full [&_table]:table-fixed"
          columns={columns}
          data={listQuery.data ?? []}
          isLoading={listQuery.isLoading}
          rowKey={(row) => row.id}
          onRowClick={(row) => router.push(`/site-snaps/${row.id}`)}
          emptyState={
            <EmptyState
              icon={Camera}
              title="No site snaps"
              description="Create a SiteSnap to start AI-assisted field tracking."
              action={{ label: "New snap", onClick: openCreateDrawer }}
            />
          }
        />
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="New site snap"
        description="Add a field photo for AI analysis."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={createSiteSnap}
              disabled={
                createMutation.isPending || uploadDraftAssetMutation.isPending
              }
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create snap
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Project ID *</Label>
            <Select
              value={form.projectId || undefined}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, projectId: value }))
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue
                  placeholder={
                    projectsQuery.isLoading
                      ? "Loading projects..."
                      : "Select project"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {form.projectId &&
                  !projectOptions.some((project) => project.id === form.projectId) && (
                    <SelectItem value={form.projectId}>
                      Current: {form.projectId}
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
            <Label>Location Zone *</Label>
            <Input
              placeholder="Grid B4 - Level 3"
              value={form.locationZone}
              onChange={(e) =>
                setForm((f) => ({ ...f, locationZone: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes *</Label>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Describe observed progress and conditions"
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>External image URLs</Label>
            <textarea
              className="flex min-h-[84px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="https://cdn.example/photo-a.jpg, https://cdn.example/photo-b.jpg"
              value={form.imageUrlsInput}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  imageUrlsInput: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Upload images</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                void handleDraftUploads(event.target.files);
                event.currentTarget.value = "";
              }}
              disabled={uploadDraftAssetMutation.isPending}
            />
            {uploadDraftAssetMutation.isPending && (
              <p className="text-xs text-muted-foreground">
                Uploading image...
              </p>
            )}
            {uploadedDraftAssets.length > 0 && (
              <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-2">
                {uploadedDraftAssets.map((asset) => (
                  <div
                    key={asset.fileAssetId}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="line-clamp-1 text-muted-foreground">
                      {asset.fileName}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() =>
                        setUploadedDraftAssets((current) =>
                          current.filter(
                            (row) => row.fileAssetId !== asset.fileAssetId,
                          ),
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Upload className="h-3 w-3" />
              Uploads are linked after snap creation.
            </p>
          </div>

          {createError && (
            <p className="text-xs text-destructive">{createError}</p>
          )}
          {createMutation.isError && (
            <p className="text-xs text-destructive">
              {(createMutation.error as Error).message}
            </p>
          )}
          {uploadDraftAssetMutation.isError && (
            <p className="text-xs text-destructive">
              {(uploadDraftAssetMutation.error as Error).message}
            </p>
          )}
        </div>
      </FormDrawer>
    </div>
  );
}
