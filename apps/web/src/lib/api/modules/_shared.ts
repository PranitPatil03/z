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

export function toQueryString(params?: object) {
  if (!params) {
    return "";
  }

  const filteredEntries = Object.entries(params).filter(([, value]) => {
    return (
      value !== undefined &&
      value !== null &&
      (typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean")
    );
  });

  const filtered = Object.fromEntries(
    filteredEntries.map(([key, value]) => [key, String(value)]),
  );

  const query = new URLSearchParams(filtered).toString();
  return query.length > 0 ? `?${query}` : "";
}
