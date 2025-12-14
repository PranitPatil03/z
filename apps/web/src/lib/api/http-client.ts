import { env } from "@/lib/env";
import { reportFrontendDiagnostic } from "@/lib/observability/frontend-observability";
import { useSessionStore } from "@/store/session-store";
import type { ApiErrorEnvelope } from "@/types/api";

export type ApiAuthMode = "internal" | "portal";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: HeadersInit;
  body?: unknown;
  authMode?: ApiAuthMode;
  signal?: AbortSignal;
  onAuthFailure?: "redirect" | "none";
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

function handleAuthFailure(authMode: ApiAuthMode) {
  if (typeof window === "undefined") {
    return;
  }

  const currentPath = `${window.location.pathname}${window.location.search}`;
  const nextValue = encodeURIComponent(currentPath);

  if (authMode === "portal") {
    useSessionStore.getState().setPortalToken(null);
    useSessionStore.getState().setAuthMode("internal");
    authNavigation.redirect(`/portal/login?next=${nextValue}&reason=expired`);
    return;
  }

  authNavigation.redirect(`/login?next=${nextValue}`);
}

export const authNavigation = {
  redirect(path: string) {
    window.location.assign(path);
  },
};

export async function requestJson<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const authMode = options.authMode ?? "internal";

  const response = await fetch(`${env.API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: buildHeaders(options),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
    credentials: authMode === "portal" ? "omit" : "include",
  });

  if (!response.ok) {
    const errorPayload = await parseErrorPayload(response);

    reportFrontendDiagnostic({
      type: "api-request-error",
      timestamp: new Date().toISOString(),
      message:
        errorPayload?.error.message ??
        `Request failed with status ${response.status}`,
      details: {
        path,
        status: response.status,
        code: errorPayload?.error.code ?? "HTTP_ERROR",
      },
    });

    if (
      response.status === 401 &&
      (options.onAuthFailure ?? "redirect") === "redirect"
    ) {
      handleAuthFailure(authMode);
    }

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
