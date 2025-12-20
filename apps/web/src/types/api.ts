export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INTERNAL_SERVER_ERROR";

export interface ApiErrorEnvelope {
  error: {
    code: ApiErrorCode | string;
    message: string;
    details?: unknown;
  };
}

export interface ApiServiceInfo {
  name: string;
  status: string;
}

export interface ApiHealthInfo {
  status: "ok" | "degraded" | "error";
  service: string;
  time: string;
}

export interface ApiReadinessInfo {
  status: "ready" | "not_ready";
  checks: Record<string, string>;
}
