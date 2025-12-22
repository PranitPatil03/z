import { requestData, requestDataWithInit, toQueryString } from "./_shared";

export type SiteSnapStatus = "captured" | "analyzing" | "reviewed";

export interface SiteSnap {
  id: string;
  organizationId: string;
  projectId: string;
  createdByUserId: string;
  notes: string;
  locationZone: string;
  status: SiteSnapStatus;
  analysisState: string;
  analysisJobId?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSnapImage {
  id: string;
  snapId: string;
  imageUrl: string | null;
  position: number;
  createdAt: string;
  fileAssetId?: string;
  sourceType?: "external_url" | "file_asset";
  originalImageUrl?: string;
}

export type SiteSnapObservationCategory =
  | "work_progress"
  | "safety_issue"
  | "material_present"
  | "site_condition"
  | "equipment";

export interface SiteSnapObservation {
  id: string;
  snapId: string;
  category: SiteSnapObservationCategory;
  confidenceBps: number;
  detail: string;
  source: "ai" | "manual";
  createdAt: string;
  updatedAt: string;
}

export interface SiteSnapDetail extends SiteSnap {
  images: SiteSnapImage[];
  observations: SiteSnapObservation[];
}

export interface CreateSiteSnapInput {
  projectId: string;
  notes: string;
  locationZone: string;
  imageUrls?: string[];
  imageFileAssetIds?: string[];
}

export interface UpdateSiteSnapInput {
  notes?: string;
  locationZone?: string;
  imageUrls?: string[];
  imageFileAssetIds?: string[];
}

export interface CreateSiteSnapObservationInput {
  category: SiteSnapObservationCategory;
  confidenceBps: number;
  detail: string;
  source?: "ai" | "manual";
}

export interface UpdateSiteSnapObservationInput {
  category?: SiteSnapObservationCategory;
  confidenceBps?: number;
  detail?: string;
}

export interface SiteSnapDailyProgress {
  day: string;
  projectId: string;
  snapCount: number;
  reviewedCount: number;
  observationCount: number;
  categoryCounts: Record<string, number>;
}

export const siteSnapsApi = {
  list: (projectId: string) =>
    requestData<SiteSnap[]>(`/site-snaps${toQueryString({ projectId })}`),

  get: (siteSnapId: string) =>
    requestData<SiteSnapDetail>(`/site-snaps/${siteSnapId}`),

  create: (body: CreateSiteSnapInput) =>
    requestDataWithInit<SiteSnap>("/site-snaps", {
      method: "POST",
      body,
    }),

  update: (siteSnapId: string, body: UpdateSiteSnapInput) =>
    requestDataWithInit<SiteSnap>(`/site-snaps/${siteSnapId}`, {
      method: "PATCH",
      body,
    }),

  analyze: (siteSnapId: string) =>
    requestDataWithInit<SiteSnap>(`/site-snaps/${siteSnapId}/analyze`, {
      method: "POST",
    }),

  reanalyze: (siteSnapId: string) =>
    requestDataWithInit<SiteSnap>(`/site-snaps/${siteSnapId}/reanalyze`, {
      method: "POST",
    }),

  review: (siteSnapId: string) =>
    requestDataWithInit<SiteSnap>(`/site-snaps/${siteSnapId}/review`, {
      method: "POST",
    }),

  createObservation: (
    siteSnapId: string,
    body: CreateSiteSnapObservationInput,
  ) =>
    requestDataWithInit<SiteSnapObservation>(
      `/site-snaps/${siteSnapId}/observations`,
      {
        method: "POST",
        body,
      },
    ),

  updateObservation: (
    siteSnapId: string,
    observationId: string,
    body: UpdateSiteSnapObservationInput,
  ) =>
    requestDataWithInit<SiteSnapObservation>(
      `/site-snaps/${siteSnapId}/observations/${observationId}`,
      {
        method: "PATCH",
        body,
      },
    ),

  deleteObservation: (siteSnapId: string, observationId: string) =>
    requestDataWithInit<SiteSnapObservation>(
      `/site-snaps/${siteSnapId}/observations/${observationId}`,
      {
        method: "DELETE",
      },
    ),

  dailyProgress: (projectId: string, day?: string) =>
    requestData<SiteSnapDailyProgress>(
      `/site-snaps/daily-progress${toQueryString({ projectId, day })}`,
    ),
};
