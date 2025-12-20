import { env } from "@/lib/env";
import { useSessionStore } from "@/store/session-store";
import type { ApiErrorEnvelope } from "@/types/api";

export type ApiAuthMode = "internal" | "portal";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: HeadersInit;
  body?: unknown;
  authMode?: ApiAuthMode;
  signal?: AbortSignal;
}

export class ApiRequestError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildHeaders(options?: RequestOptions): Headers {
  const headers = new Headers(options?.headers ?? {});
  if (!headers.has("Content-Type") && options?.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (!headers.has("x-request-id")) {
    headers.set("x-request-id", crypto.randomUUID());
  }

  const authMode = options?.authMode ?? "internal";
  if (authMode === "portal") {
    const token = useSessionStore.getState().portalToken;
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return headers;
}

async function parseErrorPayload(
  response: Response,
): Promise<ApiErrorEnvelope | null> {
  try {
    const payload = (await response.json()) as ApiErrorEnvelope;
    if (payload && typeof payload === "object" && "error" in payload) {
      return payload;
    }
  } catch {
    // Ignore parse failures and use fallback error details.
  }

  return null;
}

export async function requestJson<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${env.API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: buildHeaders(options),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
    credentials: options.authMode === "portal" ? "omit" : "include",
  });

  if (!response.ok) {
    const errorPayload = await parseErrorPayload(response);
    throw new ApiRequestError(
      response.status,
      errorPayload?.error.code ?? "HTTP_ERROR",
      errorPayload?.error.message ??
        `Request failed with status ${response.status}`,
      errorPayload?.error.details,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
