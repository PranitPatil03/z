import { requestJson } from "@/lib/api/http-client";

export interface ApiEnvelope<T> {
  data: T;
}

export async function requestData<T>(path: string) {
  const response = await requestJson<ApiEnvelope<T>>(path);
  return response.data;
}

export async function requestDataWithInit<T>(
  path: string,
  init: Parameters<typeof requestJson<ApiEnvelope<T>>>[1],
) {
  const response = await requestJson<ApiEnvelope<T>>(path, init);
  return response.data;
}

export function toQueryString(
  params?: Record<string, string | number | boolean | undefined | null>,
) {
  if (!params) {
    return "";
  }

  const filtered = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null,
    ),
  ) as Record<string, string>;

  const query = new URLSearchParams(filtered).toString();
  return query.length > 0 ? `?${query}` : "";
}
