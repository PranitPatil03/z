import { describe, expect, it } from "vitest";
import {
  getLifecycleConfirmationMessage,
  invoiceOverrideSchema,
  requiresLifecycleConfirmation,
} from "./procurement-forms";

describe("procurement forms", () => {
  it("accepts invoice override with valid reason", () => {
    const parsed = invoiceOverrideSchema.safeParse({
      allowPayOverride: true,
      payOverrideReason: "Manual approval after verified waiver",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invoice override without reason", () => {
    const parsed = invoiceOverrideSchema.safeParse({
      allowPayOverride: true,
      payOverrideReason: "short",
    });

    expect(parsed.success).toBe(false);
  });

  it("requires confirmation for terminal transitions", () => {
    expect(requiresLifecycleConfirmation("rfq", "draft", "sent")).toBe(false);
    expect(requiresLifecycleConfirmation("rfq", "sent", "closed")).toBe(true);
    expect(requiresLifecycleConfirmation("invoice", "submitted", "paid")).toBe(
      true,
    );
  });

  it("builds readable lifecycle confirmation message", () => {
    const message = getLifecycleConfirmationMessage(
      "purchaseOrder",
      "issued",
      "closed",
    );

    expect(message).toBe("Move purchaseOrder status from issued to closed?");
  });
});
