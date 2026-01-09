"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  buildSiteSnapUpdatePayload,
  extractImageReferences,
  resolveSiteSnapJobUiState,
} from "@/features/sitesnap/lib/sitesnap-utils";
import { aiApi } from "@/lib/api/modules/ai-api";
import {
  type SiteSnapObservation,
  siteSnapsApi,
} from "@/lib/api/modules/sitesnaps-api";
import { storageApi } from "@/lib/api/modules/storage-api";
import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Download,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface SiteSnapDetailPageProps {
  siteSnapId: string;
}

const OBSERVATION_CATEGORIES = [
  "work_progress",
  "safety_issue",
  "material_present",
  "site_condition",
  "equipment",
] as const;

type ObservationCategory = (typeof OBSERVATION_CATEGORIES)[number];

interface ObservationFormState {
  category: ObservationCategory;
  confidenceBps: string;
  detail: string;
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

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

function decodeRouteSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function SiteSnapDetailPage({ siteSnapId }: SiteSnapDetailPageProps) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [locationZone, setLocationZone] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageFileAssetIds, setImageFileAssetIds] = useState<string[]>([]);
  const [newExternalImageUrl, setNewExternalImageUrl] = useState("");
  const [observationForm, setObservationForm] = useState<ObservationFormState>({
    category: "work_progress" as const,
    confidenceBps: "6000",
    detail: "",
  });
  const [editingObservation, setEditingObservation] =
    useState<SiteSnapObservation | null>(null);

  const detailQuery = useQuery({
    queryKey: queryKeys.siteSnaps.detail(siteSnapId),
    queryFn: () => siteSnapsApi.get(siteSnapId),
  });

  const snap = detailQuery.data;

  useEffect(() => {
    if (!snap) {
      return;
    }

    setNotes(snap.notes);
    setLocationZone(snap.locationZone);
    const references = extractImageReferences(snap.images);
    setImageUrls(references.imageUrls);
    setImageFileAssetIds(references.imageFileAssetIds);
  }, [snap]);

  const jobQuery = useQuery({
    queryKey: queryKeys.ai.job(snap?.analysisJobId ?? ""),
    queryFn: () => aiApi.getJobStatus(snap?.analysisJobId ?? ""),
    enabled: Boolean(snap?.analysisJobId),
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      if (
        state === "completed" ||
        state === "failed" ||
        state === "not_found" ||
        state === "queue_unavailable"
      ) {
        return false;
      }

      return 4_000;
    },
  });

  const storageAssetsQuery = useQuery({
    queryKey: queryKeys.storage.list("site_snap_image", siteSnapId),
    queryFn: () =>
      storageApi.listByEntity({
        entityType: "site_snap_image",
        entityId: siteSnapId,
      }),
    enabled: Boolean(snap),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = buildSiteSnapUpdatePayload({
        notes,
        locationZone,
        imageUrls,
        imageFileAssetIds,
      });

      if (!payload.notes || payload.notes.length < 2) {
        throw new Error("Notes must be at least 2 characters");
      }
      if (!payload.locationZone || payload.locationZone.length < 1) {
        throw new Error("Location zone is required");
      }
      if (imageUrls.length === 0 && imageFileAssetIds.length === 0) {
        throw new Error("At least one image is required");
      }

      return siteSnapsApi.update(siteSnapId, payload);
    },
    onSuccess: () => {
      toast.success("Site snap updated");
      void queryClient.invalidateQueries({ queryKey: queryKeys.siteSnaps.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.storage.list("site_snap_image", siteSnapId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: (reanalyze: boolean) =>
      reanalyze
        ? siteSnapsApi.reanalyze(siteSnapId)
        : siteSnapsApi.analyze(siteSnapId),
    onSuccess: () => {
      toast.success("Analysis queued");
      void queryClient.invalidateQueries({ queryKey: queryKeys.siteSnaps.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const reviewMutation = useMutation({
    mutationFn: () => siteSnapsApi.review(siteSnapId),
    onSuccess: () => {
      toast.success("Site snap reviewed");
      void queryClient.invalidateQueries({ queryKey: queryKeys.siteSnaps.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const uploadAssetMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!snap) {
        throw new Error("Site snap is not loaded");
      }

      const session = await storageApi.createUploadSession({
        projectId: snap.projectId,
        entityType: "site_snap_image",
        entityId: siteSnapId,
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

      return session.fileAssetId;
    },
    onSuccess: (fileAssetId) => {
      setImageFileAssetIds((current) =>
        Array.from(new Set([fileAssetId, ...current])),
      );
      toast.success("Image uploaded. Save snap to apply image set.");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.storage.list("site_snap_image", siteSnapId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createObservationMutation = useMutation({
    mutationFn: () =>
      siteSnapsApi.createObservation(siteSnapId, {
        category: observationForm.category,
        confidenceBps: Number.parseInt(observationForm.confidenceBps, 10),
        detail: observationForm.detail.trim(),
        source: "manual",
      }),
    onSuccess: () => {
      toast.success("Observation added");
      setObservationForm({
        category: "work_progress",
        confidenceBps: "6000",
        detail: "",
      });
      void detailQuery.refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateObservationMutation = useMutation({
    mutationFn: () => {
      if (!editingObservation) {
        throw new Error("No observation selected");
      }

      return siteSnapsApi.updateObservation(siteSnapId, editingObservation.id, {
        category: editingObservation.category,
        confidenceBps: editingObservation.confidenceBps,
        detail: editingObservation.detail,
      });
    },
    onSuccess: () => {
      toast.success("Observation updated");
      setEditingObservation(null);
      void detailQuery.refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteObservationMutation = useMutation({
    mutationFn: (observationId: string) =>
      siteSnapsApi.deleteObservation(siteSnapId, observationId),
    onSuccess: () => {
      toast.success("Observation removed");
      void detailQuery.refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const downloadAssetMutation = useMutation({
    mutationFn: (fileAssetId: string) =>
      storageApi.createDownloadUrl(fileAssetId),
    onSuccess: (result) => {
      window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const archiveAssetMutation = useMutation({
    mutationFn: (fileAssetId: string) => storageApi.archive(fileAssetId),
    onSuccess: (_result, fileAssetId) => {
      setImageFileAssetIds((current) =>
        current.filter((item) => item !== fileAssetId),
      );
      toast.success("File asset archived");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.storage.list("site_snap_image", siteSnapId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  async function handleUploadFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    for (const file of Array.from(files)) {
      await uploadAssetMutation.mutateAsync(file);
    }
  }

  const jobUiState = resolveSiteSnapJobUiState({
    analysisState: snap?.analysisState,
    jobState: jobQuery.data?.state,
  });

  const shouldReanalyze =
    snap?.status === "reviewed" ||
    snap?.analysisState === "completed" ||
    snap?.analysisState === "queued" ||
    snap?.analysisState === "running";

  const analysisLabel =
    snap?.status === "reviewed" && jobUiState.label === "Reviewed"
      ? "Completed and reviewed"
      : jobUiState.label;

  const canRetryAnalysis = useMemo(
    () => jobUiState.canRetry || snap?.analysisState === "queue_unavailable",
    [jobUiState.canRetry, snap?.analysisState],
  );

  const breadcrumbLabel = snap?.id ?? decodeRouteSegment(siteSnapId);

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/site-snaps"
            className="transition-colors hover:text-foreground"
          >
            Site snaps
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="max-w-[240px] truncate font-medium text-foreground">
            {breadcrumbLabel}
          </span>
        </nav>
        <PageHeader title="Site snap" description="Loading site snap..." />
      </div>
    );
  }

  if (!snap) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/site-snaps"
            className="transition-colors hover:text-foreground"
          >
            Site snaps
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="max-w-[240px] truncate font-medium text-foreground">
            {breadcrumbLabel}
          </span>
        </nav>
        <PageHeader
          title="Site snap"
          description="The site snap was not found."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/site-snaps">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to SiteSnap
              </Link>
            </Button>
          }
        />
        <EmptyState
          title="Site snap unavailable"
          description="Return to the list and select another record."
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href="/site-snaps"
          className="transition-colors hover:text-foreground"
        >
          Site snaps
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="max-w-[240px] truncate font-medium text-foreground">
          {breadcrumbLabel}
        </span>
      </nav>

      <PageHeader
        title="Site snap detail"
        description={`Zone ${snap.locationZone} • ${formatDateTime(snap.createdAt)}`}
        action={
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Button asChild variant="outline" size="sm" className="shrink-0 whitespace-nowrap">
              <Link href="/site-snaps">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 whitespace-nowrap"
              onClick={() => analyzeMutation.mutate(Boolean(shouldReanalyze))}
              disabled={analyzeMutation.isPending}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              {shouldReanalyze ? "Reanalyze" : "Analyze"}
            </Button>
            {snap.status !== "reviewed" && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 whitespace-nowrap"
                onClick={() => reviewMutation.mutate()}
                disabled={reviewMutation.isPending}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Mark reviewed
              </Button>
            )}
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="mt-2">
            <StatusBadge status={snap.status} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Analysis state</p>
          <p
            className={cn(
              "mt-2 text-sm font-medium",
              jobUiState.tone === "critical" &&
                "text-red-700 dark:text-red-400",
              jobUiState.tone === "warning" &&
                "text-amber-700 dark:text-amber-400",
              jobUiState.tone === "success" &&
                "text-green-700 dark:text-green-400",
              jobUiState.tone === "normal" && "text-foreground",
            )}
          >
            {analysisLabel}
          </p>
          {jobQuery.data?.failedReason && (
            <p className="mt-1 text-xs text-destructive">
              {jobQuery.data.failedReason}
            </p>
          )}
          {canRetryAnalysis && (
            <Button
              className="mt-2"
              size="sm"
              variant="outline"
              onClick={() => analyzeMutation.mutate(true)}
              disabled={analyzeMutation.isPending}
            >
              Retry analysis
            </Button>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Review timestamp</p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {formatDateTime(snap.reviewedAt)}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Update snap
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Notes</Label>
            <textarea
              className="flex min-h-[96px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Location zone</Label>
            <Input
              value={locationZone}
              onChange={(event) => setLocationZone(event.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>External image URLs</Label>
            <div className="flex gap-2">
              <Input
                value={newExternalImageUrl}
                onChange={(event) => setNewExternalImageUrl(event.target.value)}
                placeholder="https://cdn.example/photo.jpg"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const value = newExternalImageUrl.trim();
                  if (!value) {
                    return;
                  }
                  setImageUrls((current) =>
                    Array.from(new Set([...current, value])),
                  );
                  setNewExternalImageUrl("");
                }}
              >
                Add
              </Button>
            </div>
            {imageUrls.length > 0 && (
              <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-2">
                {imageUrls.map((url) => (
                  <div
                    key={url}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="line-clamp-1 text-muted-foreground">
                      {url}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() =>
                        setImageUrls((current) =>
                          current.filter((item) => item !== url),
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Upload image file assets</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                void handleUploadFiles(event.target.files);
                event.currentTarget.value = "";
              }}
              disabled={uploadAssetMutation.isPending}
            />
            {uploadAssetMutation.isPending && (
              <p className="text-xs text-muted-foreground">
                Uploading image...
              </p>
            )}
            {imageFileAssetIds.length > 0 && (
              <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-2">
                {imageFileAssetIds.map((assetId) => (
                  <div
                    key={assetId}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-mono text-muted-foreground">
                      {assetId}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() =>
                        setImageFileAssetIds((current) =>
                          current.filter((item) => item !== assetId),
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
              Save the snap after changes to apply the image set.
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save changes
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-base font-semibold text-foreground">
          Observations
        </h2>

        <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3 md:grid-cols-4">
          <Select
            value={observationForm.category}
            onChange={(event) =>
              setObservationForm((current) => ({
                ...current,
                category: event.target
                  .value as (typeof OBSERVATION_CATEGORIES)[number],
              }))
            }
          >
            {OBSERVATION_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            min="0"
            max="10000"
            value={observationForm.confidenceBps}
            onChange={(event) =>
              setObservationForm((current) => ({
                ...current,
                confidenceBps: event.target.value,
              }))
            }
            placeholder="Confidence bps"
          />
          <Input
            className="md:col-span-2"
            value={observationForm.detail}
            onChange={(event) =>
              setObservationForm((current) => ({
                ...current,
                detail: event.target.value,
              }))
            }
            placeholder="Add observation detail"
          />
          <div className="md:col-span-4 flex justify-end">
            <Button
              variant="outline"
              onClick={() => createObservationMutation.mutate()}
              disabled={createObservationMutation.isPending}
            >
              Add observation
            </Button>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {snap.observations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No observations recorded.
            </p>
          ) : (
            snap.observations.map((observation) => {
              const isEditing = editingObservation?.id === observation.id;
              const current = isEditing ? editingObservation : observation;

              return (
                <div
                  key={observation.id}
                  className="space-y-2 rounded-lg border border-border px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={current.category} />
                      <span className="text-xs text-muted-foreground">
                        {(current.confidenceBps / 100).toFixed(2)}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {current.source}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() =>
                          setEditingObservation(
                            isEditing
                              ? null
                              : {
                                  ...observation,
                                },
                          )
                        }
                      >
                        {isEditing ? "Cancel" : "Edit"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive"
                        onClick={() => {
                          if (window.confirm("Delete this observation?")) {
                            deleteObservationMutation.mutate(observation.id);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="grid gap-2 md:grid-cols-3">
                      <Select
                        value={current.category}
                        onChange={(event) =>
                          setEditingObservation((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  category: event.target
                                    .value as SiteSnapObservation["category"],
                                }
                              : prev,
                          )
                        }
                      >
                        {OBSERVATION_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </Select>
                      <Input
                        type="number"
                        min="0"
                        max="10000"
                        value={String(current.confidenceBps)}
                        onChange={(event) =>
                          setEditingObservation((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  confidenceBps:
                                    Number.parseInt(event.target.value, 10) ||
                                    0,
                                }
                              : prev,
                          )
                        }
                      />
                      <Button
                        variant="outline"
                        onClick={() => updateObservationMutation.mutate()}
                        disabled={updateObservationMutation.isPending}
                      >
                        Save observation
                      </Button>
                      <Input
                        className="md:col-span-3"
                        value={current.detail}
                        onChange={(event) =>
                          setEditingObservation((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  detail: event.target.value,
                                }
                              : prev,
                          )
                        }
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-foreground">
                      {observation.detail}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-base font-semibold text-foreground">
          File lifecycle
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Manage uploaded image file assets (download and archive).
        </p>

        <div className="space-y-2">
          {(storageAssetsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No linked file assets.
            </p>
          ) : (
            (storageAssetsQuery.data ?? []).map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {asset.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {asset.contentType} • {formatBytes(asset.sizeBytes)} •{" "}
                    {asset.status}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadAssetMutation.mutate(asset.id)}
                    disabled={
                      downloadAssetMutation.isPending ||
                      asset.status !== "uploaded"
                    }
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => {
                      if (window.confirm("Archive this file asset?")) {
                        archiveAssetMutation.mutate(asset.id);
                      }
                    }}
                    disabled={
                      archiveAssetMutation.isPending ||
                      asset.status === "deleted"
                    }
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Archive
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {snap.images.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-base font-semibold text-foreground">
            Image previews
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {snap.images.map((image) => (
              <div
                key={image.id}
                className="overflow-hidden rounded-lg border border-border"
              >
                {image.imageUrl ? (
                  <img
                    src={image.imageUrl}
                    alt={`Site snap ${image.position + 1}`}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-muted text-xs text-muted-foreground">
                    Preview unavailable
                  </div>
                )}
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  {image.sourceType ?? "unknown"}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Site snap archive endpoint is not currently exposed by backend routes.
        File asset archive is available.
      </p>
    </div>
  );
}
