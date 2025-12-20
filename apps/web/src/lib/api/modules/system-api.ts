import { requestJson } from "@/lib/api/http-client";
import type {
  ApiHealthInfo,
  ApiReadinessInfo,
  ApiServiceInfo,
} from "@/types/api";

export async function getServiceInfo() {
  return requestJson<ApiServiceInfo>("/");
}

export async function getHealthStatus() {
  return requestJson<ApiHealthInfo>("/health");
}

export async function getReadinessStatus() {
  return requestJson<ApiReadinessInfo>("/health/ready");
}

export async function getOpenApiDocument() {
  return requestJson<Record<string, unknown>>("/openapi.json");
}
