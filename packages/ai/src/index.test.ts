import { describe, expect, it } from "vitest";
import { buildEstimateBrief, listSupportedProviders, routeAiRequest } from "./index";

describe("ai package", () => {
  it("returns supported providers", () => {
    expect(listSupportedProviders()).toEqual(["openai", "anthropic", "gemini", "azure-openai"]);
  });

  it("builds estimate brief with required sections", () => {
    const brief = buildEstimateBrief({
      projectName: "Tower A",
      scope: "Structural concrete package",
      budgetCents: 15000000,
      constraints: ["night shifts", "noise limits"],
    });

    expect(brief).toContain("Project: Tower A");
    expect(brief).toContain("Budget: $150000.00");
    expect(brief).toContain("Constraints:");
  });

  it("routes ai request and enriches output", () => {
    const response = routeAiRequest({
      model: "gpt-4.1",
      prompt: "Summarize progress",
      context: { projectId: "p1" },
    });

    expect(response.provider).toBe("openai");
    expect(response.output).toContain("Provider style");
    expect(response.output).toContain("projectId");
  });
});
