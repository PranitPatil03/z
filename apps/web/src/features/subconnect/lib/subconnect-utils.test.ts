import { describe, expect, it } from "vitest";
import {
  complianceHealth,
  parseCommaSeparated,
  riskLevelFromScoreBps,
  toIsoOrUndefined,
} from "./subconnect-utils";

describe("subconnect utils", () => {
  it("parses and deduplicates comma-separated values", () => {
    expect(parseCommaSeparated("A, B, A, C")).toEqual(["A", "B", "C"]);
  });

  it("returns undefined for invalid date inputs", () => {
    expect(toIsoOrUndefined("")).toBeUndefined();
    expect(toIsoOrUndefined("invalid-date")).toBeUndefined();
  });

  it("derives risk level from score basis points", () => {
    expect(riskLevelFromScoreBps(9000)).toBe("low");
    expect(riskLevelFromScoreBps(7000)).toBe("medium");
    expect(riskLevelFromScoreBps(5000)).toBe("high");
    expect(riskLevelFromScoreBps(2000)).toBe("critical");
  });

  it("marks compliance as critical when overdue items exist", () => {
    const result = complianceHealth({
      total: 4,
      pending: 1,
      verified: 0,
      expiring: 0,
      compliant: 0,
      nonCompliant: 1,
      expired: 0,
      dueSoon: 1,
      overdue: 1,
    });

    expect(result.tone).toBe("critical");
  });
});
