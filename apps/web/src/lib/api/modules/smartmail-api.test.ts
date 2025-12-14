/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { smartmailApi } from "./smartmail-api";

function envelopeResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify({ data: payload }), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("smartmail api", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds thread list query string", async () => {
    fetchMock.mockResolvedValueOnce(envelopeResponse([]));

    await smartmailApi.listThreads({
      projectId: "proj_1",
      accountId: "acc_1",
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/smartmail/threads?");
    expect(String(url)).toContain("projectId=proj_1");
    expect(String(url)).toContain("accountId=acc_1");
    expect(init?.method).toBe("GET");
  });

  it("posts draft generation payload to thread endpoint", async () => {
    fetchMock.mockResolvedValueOnce(
      envelopeResponse({
        draft: "Draft output",
        message: {
          id: "msg_1",
          threadId: "th_1",
          organizationId: "org_1",
          projectId: "proj_1",
          direction: "outbound",
          status: "draft",
          fromEmail: "ops@example.com",
          toEmail: "",
          ccEmails: [],
          bccEmails: [],
          subject: "Subject",
          body: "Draft output",
          linkConfidenceBps: 0,
          aiDraft: 1,
          isAiDraft: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    );

    await smartmailApi.createDraft("th_1", {
      projectId: "proj_1",
      accountId: "acc_1",
      prompt: "Generate a concise follow-up message for the vendor.",
      provider: "openai",
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/smartmail/threads/th_1/drafts");
    expect(init?.method).toBe("POST");

    const body = JSON.parse(String(init?.body)) as {
      projectId: string;
      accountId: string;
      prompt: string;
      provider: string;
    };

    expect(body.projectId).toBe("proj_1");
    expect(body.accountId).toBe("acc_1");
    expect(body.provider).toBe("openai");
  });

  it("sends delete request for template removal", async () => {
    fetchMock.mockResolvedValueOnce(
      envelopeResponse({ id: "tpl_1", deletedAt: new Date().toISOString() }),
    );

    await smartmailApi.deleteTemplate("tpl_1");

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/smartmail/templates/tpl_1");
    expect(init?.method).toBe("DELETE");
  });
});
