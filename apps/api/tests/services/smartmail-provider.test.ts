import { describe, expect, it } from "vitest";
import {
  decryptOpaqueToken,
  encryptOpaqueToken,
  signStatePayload,
  verifySignedStatePayload,
} from "../../src/services/smartmail-provider";

describe("smartmail provider token helpers", () => {
  it("encrypts and decrypts opaque tokens", () => {
    const secret = "module5-test-secret";
    const original = "token-value-123";

    const encrypted = encryptOpaqueToken(original, secret);
    expect(encrypted).not.toBe(original);

    const decrypted = decryptOpaqueToken(encrypted, secret);
    expect(decrypted).toBe(original);
  });

  it("rejects malformed encrypted tokens", () => {
    expect(() => decryptOpaqueToken("malformed", "module5-test-secret")).toThrow(
      "Invalid encrypted token format",
    );
  });

  it("signs and verifies OAuth state payloads", () => {
    const secret = "module5-signing-secret";
    const payload = JSON.stringify({ orgId: "org-1", provider: "gmail" });

    const signed = signStatePayload(payload, secret);
    const verifiedPayload = verifySignedStatePayload(signed, secret);

    expect(verifiedPayload).toBe(payload);
  });

  it("rejects tampered signed payloads", () => {
    const secret = "module5-signing-secret";
    const payload = "{\"orgId\":\"org-1\"}";
    const signed = signStatePayload(payload, secret);
    const tampered = `${signed.slice(0, -1)}0`;

    expect(() => verifySignedStatePayload(tampered, secret)).toThrow(
      "State parameter signature verification failed",
    );
  });
});
