/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { integrationsApi } from "./integrations-api";

function envelopeResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify({ data: payload }), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("integrations api", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists integrations", async () => {
    fetchMock.mockResolvedValueOnce(envelopeResponse([]));

    await integrationsApi.list();

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/integrations");
    expect(init?.method).toBe("GET");
  });

  it("creates integration with payload", async () => {
    fetchMock.mockResolvedValueOnce(
      envelopeResponse({
        id: "int_1",
        organizationId: "org_1",
        provider: "stripe",
        name: "Stripe",
        status: "disconnected",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );

    await integrationsApi.create({
      provider: "stripe",
      name: "Stripe",
      config: { region: "us" },
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/integrations");
    expect(init?.method).toBe("POST");

    const body = JSON.parse(String(init?.body)) as {
      provider: string;
      name: string;
      config: { region: string };
    };

    expect(body.provider).toBe("stripe");
    expect(body.name).toBe("Stripe");
    expect(body.config.region).toBe("us");
  });

  it("disconnects integration", async () => {
    fetchMock.mockResolvedValueOnce(
      envelopeResponse({
        id: "int_1",
        organizationId: "org_1",
        provider: "stripe",
        name: "Stripe",
        status: "disconnected",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );

    await integrationsApi.disconnect("int_1");

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/integrations/int_1/disconnect");
    expect(init?.method).toBe("POST");
  });
});
