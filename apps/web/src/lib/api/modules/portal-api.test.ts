/** @vitest-environment jsdom */

import { useSessionStore } from "@/store/session-store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { portalApi } from "./portal-api";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("portal api", () => {
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

  it("posts register requests through public portal auth flow", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "sub_1",
        email: "portal@vendor.com",
        name: "Vendor One",
        projectId: "proj_1",
        message: "ok",
      }),
    );

    const result = await portalApi.register({
      email: "portal@vendor.com",
      password: "password123",
      name: "Vendor One",
      trade: "Electrical",
      projectCode: "PROJECT-1",
    });

    expect(result.id).toBe("sub_1");

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/portal/register");
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("omit");
  });

  it("includes bearer token for protected compliance updates", async () => {
    useSessionStore.getState().setPortalToken("portal-token");

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        compliance: {
          id: "cmp_1",
          organizationId: "org_1",
          projectId: "proj_1",
          subcontractorId: "sub_1",
          complianceType: "Insurance",
          status: "pending",
          highRisk: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    );

    await portalApi.updateCompliance({
      complianceItemId: "cmp_1",
      evidence: "https://files.example/evidence.pdf",
      notes: "Uploaded latest certificate",
    });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const headers = init?.headers as Headers;

    expect(init?.method).toBe("PATCH");
    expect(init?.credentials).toBe("omit");
    expect(headers.get("Authorization")).toBe("Bearer portal-token");
  });

  it("builds filtered pay applications list query", async () => {
    useSessionStore.getState().setPortalToken("portal-token");

    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    await portalApi.listPayApplications({ status: "submitted", limit: 25 });

    const [url] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/portal/pay-applications?");
    expect(String(url)).toContain("status=submitted");
    expect(String(url)).toContain("limit=25");
  });

  it("posts daily log payloads to workflow endpoint", async () => {
    useSessionStore.getState().setPortalToken("portal-token");

    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          data: {
            id: "log_1",
            organizationId: "org_1",
            projectId: "proj_1",
            subcontractorId: "sub_1",
            logDate: new Date().toISOString(),
            laborCount: 12,
            performedWork: "Installed branch circuits",
            reviewStatus: "pending",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
        201,
      ),
    );

    const result = await portalApi.createDailyLog({
      logDate: new Date().toISOString(),
      laborCount: 12,
      equipmentUsed: ["Lift"],
      attachments: ["https://files.example/photo-1.jpg"],
      performedWork: "Installed branch circuits",
    });

    expect(result.data.id).toBe("log_1");

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/portal/daily-logs");
    expect(init?.method).toBe("POST");
  });
});
