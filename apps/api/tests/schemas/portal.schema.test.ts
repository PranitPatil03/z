import { describe, expect, it } from "vitest";
import {
  complianceItemIdParamsSchema,
  portalComplianceUpdateSchema,
  portalComplianceUploadSchema,
  portalLoginSchema,
  portalRegisterSchema,
} from "../../src/schemas/portal.schema";

describe("portal schemas", () => {
  it("accepts valid registration payload", () => {
    const parsed = portalRegisterSchema.parse({
      email: "subcontractor@example.com",
      password: "supersecure123",
      name: "John Sub",
      trade: "Electrical",
      projectCode: "PRJ-001",
      phone: "+1-555-1000",
    });

    expect(parsed.email).toBe("subcontractor@example.com");
    expect(parsed.trade).toBe("Electrical");
  });

  it("rejects invalid registration email", () => {
    expect(() =>
      portalRegisterSchema.parse({
        email: "not-an-email",
        password: "supersecure123",
        name: "John Sub",
        trade: "Electrical",
        projectCode: "PRJ-001",
      }),
    ).toThrow();
  });

  it("rejects short registration password", () => {
    expect(() =>
      portalRegisterSchema.parse({
        email: "subcontractor@example.com",
        password: "short",
        name: "John Sub",
        trade: "Electrical",
        projectCode: "PRJ-001",
      }),
    ).toThrow();
  });

  it("accepts valid login payload", () => {
    const parsed = portalLoginSchema.parse({
      email: "subcontractor@example.com",
      password: "supersecure123",
    });

    expect(parsed.email).toBe("subcontractor@example.com");
  });

  it("rejects login without password", () => {
    expect(() =>
      portalLoginSchema.parse({
        email: "subcontractor@example.com",
      }),
    ).toThrow();
  });

  it("accepts compliance upload payload", () => {
    const parsed = portalComplianceUploadSchema.parse({
      complianceItemId: "cmp-123",
      evidence: "https://example.com/file.pdf",
      notes: "Uploaded latest certificate",
    });

    expect(parsed.complianceItemId).toBe("cmp-123");
  });

  it("rejects compliance upload without compliance item id", () => {
    expect(() =>
      portalComplianceUploadSchema.parse({
        complianceItemId: "",
      }),
    ).toThrow();
  });

  it("accepts compliance status update enum values", () => {
    const parsed = portalComplianceUpdateSchema.parse({
      status: "compliant",
      notes: "Reviewed",
    });

    expect(parsed.status).toBe("compliant");
  });

  it("rejects invalid compliance status", () => {
    expect(() =>
      portalComplianceUpdateSchema.parse({
        status: "unknown",
      }),
    ).toThrow();
  });

  it("accepts params schema with compliance item id", () => {
    const parsed = complianceItemIdParamsSchema.parse({
      complianceItemId: "cmp-555",
    });

    expect(parsed.complianceItemId).toBe("cmp-555");
  });
});
