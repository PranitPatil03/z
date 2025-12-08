import { describe, expect, it } from "vitest";
import { detectDeterministicEntityLink } from "../../src/services/smartmail-linking";

describe("detectDeterministicEntityLink", () => {
  it("matches purchase order references with highest confidence", () => {
    const result = detectDeterministicEntityLink("Please review PO-3347 and confirm shipment", {
      purchaseOrders: [{ id: "po-1", ref: "PO-3347" }],
      invoices: [{ id: "inv-1", ref: "INV-889" }],
      changeOrders: [],
      subcontractors: [],
    });

    expect(result).toEqual({
      linkedEntityType: "purchase_order",
      linkedEntityId: "po-1",
      confidenceBps: 9600,
      reason: "Matched purchase order reference PO-3347",
    });
  });

  it("matches invoice references when no purchase order is present", () => {
    const result = detectDeterministicEntityLink("Invoice INV-2026-A is attached", {
      purchaseOrders: [],
      invoices: [{ id: "inv-1", ref: "INV-2026-A" }],
      changeOrders: [],
      subcontractors: [],
    });

    expect(result?.linkedEntityType).toBe("invoice");
    expect(result?.linkedEntityId).toBe("inv-1");
  });

  it("returns null when no deterministic match exists", () => {
    const result = detectDeterministicEntityLink("Hello there", {
      purchaseOrders: [{ id: "po-1", ref: "PO-3347" }],
      invoices: [{ id: "inv-1", ref: "INV-889" }],
      changeOrders: [{ id: "co-1", ref: "Mechanical scope" }],
      subcontractors: [{ id: "sub-1", ref: "electrical@example.com" }],
    });

    expect(result).toBeNull();
  });
});
