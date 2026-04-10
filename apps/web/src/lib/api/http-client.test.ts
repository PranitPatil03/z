/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionStore } from "../../store/session-store";
import * as httpClient from "./http-client";

const { ApiRequestError, requestJson } = httpClient;

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("requestJson", () => {
  const fetchMock = vi.fn<typeof fetch>();
  let redirectSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();

    useSessionStore.getState().clearSession();
    redirectSpy = vi
      .spyOn(httpClient.authNavigation, "redirect")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    redirectSpy.mockRestore();
    vi.unstubAllGlobals();
    useSessionStore.getState().clearSession();
  });

  it("uses credentials include for internal calls", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "ok" }));

    const result = await requestJson<{ status: string }>("/health");

    expect(result.status).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const headers = init?.headers as Headers;

    expect(init?.credentials).toBe("include");
    expect(headers.get("Authorization")).toBeNull();
    expect(headers.get("Accept")).toBe("application/json");
  });

  it("uses bearer auth with omitted credentials for portal calls", async () => {
    useSessionStore.getState().setPortalToken("portal-token");

    fetchMock.mockResolvedValueOnce(jsonResponse({ profile: { id: "abc" } }));

    await requestJson<{ profile: { id: string } }>("/portal/profile", {
      authMode: "portal",
      onAuthFailure: "none",
    });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const headers = init?.headers as Headers;

    expect(init?.credentials).toBe("omit");
    expect(headers.get("Authorization")).toBe("Bearer portal-token");
  });

  it("can suppress auth redirect handling", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Missing session",
          },
        },
        401,
      ),
    );

    await expect(
      requestJson("/projects", {
        onAuthFailure: "none",
      }),
    ).rejects.toBeInstanceOf(ApiRequestError);

    expect(redirectSpy).not.toHaveBeenCalled();
  });

  it("clears portal session and redirects on portal auth failure", async () => {
    useSessionStore.getState().setPortalToken("portal-token");
    useSessionStore.getState().setAuthMode("portal");

    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Token expired",
          },
        },
        401,
      ),
    );

    await expect(
      requestJson("/portal/overview", {
        authMode: "portal",
      }),
    ).rejects.toBeInstanceOf(ApiRequestError);

    const state = useSessionStore.getState();
    expect(state.portalToken).toBeNull();
    expect(state.authMode).toBe("internal");
    expect(redirectSpy).toHaveBeenCalledTimes(1);

    const redirectTarget = String(redirectSpy.mock.calls[0]?.[0] ?? "");
    expect(redirectTarget.startsWith("/portal/login?next=")).toBe(true);
    expect(redirectTarget.includes("reason=expired")).toBe(true);
  });
});
