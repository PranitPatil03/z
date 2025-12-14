import type { SiteSnapImage } from "@/lib/api/modules/sitesnaps-api";

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseImageUrlInput(input: string) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const chunk of input.split(/[\n,]+/)) {
    const value = chunk.trim();
    if (!value || !isHttpUrl(value) || seen.has(value)) {
      continue;
    }

    seen.add(value);
    result.push(value);
  }

  return result;
}

export function extractImageReferences(images: SiteSnapImage[]) {
  const imageUrls: string[] = [];
  const imageFileAssetIds: string[] = [];

  for (const image of images) {
    if (image.fileAssetId) {
      imageFileAssetIds.push(image.fileAssetId);
      continue;
    }

    const externalUrl =
      image.sourceType === "external_url"
        ? (image.originalImageUrl ?? image.imageUrl)
        : image.imageUrl;

    if (externalUrl && isHttpUrl(externalUrl)) {
      imageUrls.push(externalUrl);
    }
  }

  return {
    imageUrls: Array.from(new Set(imageUrls)),
    imageFileAssetIds: Array.from(new Set(imageFileAssetIds)),
  };
}

export function buildSiteSnapUpdatePayload(input: {
  notes?: string;
  locationZone?: string;
  imageUrls?: string[];
  imageFileAssetIds?: string[];
}) {
  const notes = input.notes?.trim();
  const locationZone = input.locationZone?.trim();

  return {
    notes: notes && notes.length > 0 ? notes : undefined,
    locationZone:
      locationZone && locationZone.length > 0 ? locationZone : undefined,
    imageUrls:
      input.imageUrls && input.imageUrls.length > 0
        ? input.imageUrls
        : undefined,
    imageFileAssetIds:
      input.imageFileAssetIds && input.imageFileAssetIds.length > 0
        ? input.imageFileAssetIds
        : undefined,
  };
}

export interface SiteSnapJobUiState {
  label: string;
  tone: "normal" | "warning" | "critical" | "success";
  canRetry: boolean;
  isTerminal: boolean;
}

export function resolveSiteSnapJobUiState(input: {
  analysisState?: string | null;
  jobState?: string | null;
}) {
  const analysisState = input.analysisState ?? "idle";
  const jobState = input.jobState ?? null;

  if (analysisState === "reviewed") {
    return {
      label: "Reviewed",
      tone: "success",
      canRetry: false,
      isTerminal: true,
    } satisfies SiteSnapJobUiState;
  }

  if (analysisState === "completed" || jobState === "completed") {
    return {
      label: "Analysis completed",
      tone: "success",
      canRetry: false,
      isTerminal: true,
    } satisfies SiteSnapJobUiState;
  }

  if (
    analysisState === "queue_unavailable" ||
    jobState === "failed" ||
    jobState === "not_found"
  ) {
    return {
      label: "Analysis failed",
      tone: "critical",
      canRetry: true,
      isTerminal: true,
    } satisfies SiteSnapJobUiState;
  }

  if (
    analysisState === "queued" ||
    analysisState === "running" ||
    jobState === "active" ||
    jobState === "waiting" ||
    jobState === "waiting-children" ||
    jobState === "delayed" ||
    jobState === "paused"
  ) {
    return {
      label: "Analysis in progress",
      tone: "warning",
      canRetry: false,
      isTerminal: false,
    } satisfies SiteSnapJobUiState;
  }

  return {
    label: "Idle",
    tone: "normal",
    canRetry: false,
    isTerminal: false,
  } satisfies SiteSnapJobUiState;
}
