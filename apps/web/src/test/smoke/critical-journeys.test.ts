/** @vitest-environment jsdom */

import { billingApi } from "@/lib/api/modules/billing-api";
import { portalApi } from "@/lib/api/modules/portal-api";
import { smartmailApi } from "@/lib/api/modules/smartmail-api";
import { useSessionStore } from "@/store/session-store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function envelopeResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify({ data: payload }), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("critical journeys smoke", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    useSessionStore.getState().clearSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useSessionStore.getState().clearSession();
  });

  it("smoke: billing record list route is reachable", async () => {
    fetchMock.mockResolvedValueOnce(envelopeResponse([]));

    await billingApi.list();

    const [url] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/billing");
  });

  it("smoke: smartmail accounts route is reachable", async () => {
    fetchMock.mockResolvedValueOnce(envelopeResponse([]));

    await smartmailApi.listAccounts();

    const [url] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/smartmail/accounts");
  });

  it("smoke: portal pay applications route uses portal auth token", async () => {
    useSessionStore.getState().setPortalToken("portal-token");
    fetchMock.mockResolvedValueOnce(envelopeResponse([], 200));

    await portalApi.listPayApplications({ limit: 10 });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/portal/pay-applications");
    const headers = init?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer portal-token");
  });
});
