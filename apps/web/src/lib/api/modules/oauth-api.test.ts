/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { oauthApi } from "./oauth-api";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("oauth api", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches gmail auth url", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ authUrl: "https://accounts.example", state: "state-1" }),
    );

    const result = await oauthApi.getGmailAuthUrl();

    expect(result.authUrl).toContain("https://accounts.example");
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/auth/oauth/gmail/auth-url");
    expect(init?.method).toBe("GET");
  });

  it("posts oauth callback payload", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        account: {
          id: "acc_1",
          email: "mail@example.com",
          provider: "gmail",
          status: "connected",
          connectedAt: new Date().toISOString(),
        },
      }),
    );

    await oauthApi.handleOAuthCallback({
      code: "oauth-code",
      state: "oauth-state",
      provider: "gmail",
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/auth/oauth/callback");
    expect(init?.method).toBe("POST");

    const body = JSON.parse(String(init?.body)) as {
      code: string;
      state: string;
      provider: string;
    };

    expect(body.code).toBe("oauth-code");
    expect(body.state).toBe("oauth-state");
    expect(body.provider).toBe("gmail");
  });

  it("posts disconnect payload", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        account: {
          id: "acc_1",
          email: "mail@example.com",
          status: "disconnected",
        },
      }),
    );

    await oauthApi.disconnectOAuthAccount({ accountId: "acc_1" });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/auth/oauth/disconnect");
    expect(init?.method).toBe("POST");
  });
});
