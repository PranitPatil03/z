import { describe, expect, it } from "vitest";
import {
  getDefaultsForPlan,
  getFeatureConfigForPlan,
} from "../../src/services/entitlements";

describe("entitlements service helpers", () => {
  it("returns AI credit defaults per plan", () => {
    expect(getDefaultsForPlan("starter")).toEqual({
      aiCreditsIncluded: 1500,
      allowOverage: false,
      overagePriceCents: 0,
    });

    expect(getDefaultsForPlan("growth")).toEqual({
      aiCreditsIncluded: 20000,
      allowOverage: true,
      overagePriceCents: 2,
    });

    expect(getDefaultsForPlan("enterprise")).toEqual({
      aiCreditsIncluded: 100000,
      allowOverage: true,
      overagePriceCents: 0,
    });
  });

  it("returns feature gates and limits per plan", () => {
    const starter = getFeatureConfigForPlan("starter");
    expect(starter.enabledFeatures).toContain("ai.generate");
    expect(starter.enabledFeatures).toContain("smartmail.ai_draft");
    expect(starter.enabledFeatures).not.toContain("smartmail.multi_account");
    expect(starter.limits.smartmailAccounts).toBe(1);

    const growth = getFeatureConfigForPlan("growth");
    expect(growth.enabledFeatures).toContain("smartmail.multi_account");
    expect(growth.limits.smartmailAccounts).toBe(5);

    const enterprise = getFeatureConfigForPlan("enterprise");
    expect(enterprise.enabledFeatures).toContain("smartmail.multi_account");
    expect(enterprise.limits.smartmailAccounts).toBeNull();
  });
});
