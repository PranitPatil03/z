import { requestData, requestDataWithInit, toQueryString } from "./_shared";

export type FileAssetStatus = "pending" | "uploaded" | "failed" | "deleted";

export interface FileAsset {
  id: string;
  organizationId: string;
  projectId?: string | null;
  entityType: string;
  entityId: string;
  uploadedByUserId: string;
  bucket: string;
  storageKey: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  status: FileAssetStatus;
  eTag?: string | null;
  metadata?: Record<string, unknown> | null;
  uploadedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateUploadSessionInput {
  projectId?: string;
  entityType: string;
  entityId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  metadata?: Record<string, unknown>;
}

export interface UploadSession {
  fileAssetId: string;
  bucket: string;
  storageKey: string;
  uploadUrl: string;
  expiresIn: number;
  requiredHeaders: Record<string, string>;
}

export interface DownloadUrlResult {
  fileAssetId: string;
  downloadUrl: string;
  expiresIn: number;
}

export const storageApi = {
  listByEntity: (params: { entityType: string; entityId: string }) =>
    requestData<FileAsset[]>(`/storage${toQueryString(params)}`),

  createUploadSession: (body: CreateUploadSessionInput) =>
    requestDataWithInit<UploadSession>("/storage/upload-session", {
      method: "POST",
      body,
    }),

  completeUpload: (fileAssetId: string, body: { eTag?: string }) =>
    requestDataWithInit<FileAsset>(`/storage/${fileAssetId}/complete`, {
      method: "POST",
      body,
    }),

  createDownloadUrl: (fileAssetId: string) =>
    requestData<DownloadUrlResult>(`/storage/${fileAssetId}/download-url`),

  archive: (fileAssetId: string) =>
    requestDataWithInit<FileAsset>(`/storage/${fileAssetId}`, {
      method: "DELETE",
    }),

  async uploadToSignedUrl(
    uploadUrl: string,
    file: File,
    requiredHeaders?: Record<string, string>,
  ) {
    const headers = new Headers(requiredHeaders ?? {});
    if (!headers.has("content-type") && file.type) {
      headers.set("content-type", file.type);
    }

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers,
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }

    return {
      eTag: response.headers.get("etag")?.replace(/\"/g, "") || undefined,
    };
  },
};
