import { describe, expect, it } from "vitest";
import {
  createSmartMailAccountSchema,
  createSmartMailMessageSchema,
  createSmartMailTemplateSchema,
  syncSmartMailAccountSchema,
  updateSmartMailMessageLinkSchema,
} from "../../src/schemas/smartmail.schema";

describe("smartmail schemas", () => {
  it("accepts valid account creation payload", () => {
    const parsed = createSmartMailAccountSchema.parse({
      provider: "gmail",
      email: "pm@example.com",
      autoSyncEnabled: true,
      defaultProjectId: "proj-1",
    });

    expect(parsed.provider).toBe("gmail");
    expect(parsed.email).toBe("pm@example.com");
  });

  it("rejects unsupported provider", () => {
    expect(() =>
      createSmartMailAccountSchema.parse({
        provider: "yahoo",
        email: "pm@example.com",
      }),
    ).toThrow();
  });

  it("requires recipient list for message creation", () => {
    expect(() =>
      createSmartMailMessageSchema.parse({
        projectId: "proj-1",
        accountId: "acc-1",
        toEmails: [],
        body: "Hello",
      }),
    ).toThrow();
  });

  it("parses sync payload defaults", () => {
    const parsed = syncSmartMailAccountSchema.parse({});
    expect(parsed.maxResults).toBe(50);
  });

  it("accepts manual link clear payload", () => {
    const parsed = updateSmartMailMessageLinkSchema.parse({
      clear: true,
    });

    expect(parsed.clear).toBe(true);
  });

  it("applies default template type", () => {
    const parsed = createSmartMailTemplateSchema.parse({
      name: "Status update",
      bodyTemplate: "Hello team",
    });

    expect(parsed.type).toBe("template");
    expect(parsed.subjectTemplate).toBe("");
  });
});
