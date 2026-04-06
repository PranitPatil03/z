import { describe, expect, it } from "vitest";
import { parseSiteSnapObservations } from "./site-snap-analysis";

describe("parseSiteSnapObservations", () => {
  it("parses structured JSON observations", () => {
    const output = JSON.stringify({
      observations: [
        {
          category: "safety_issue",
          confidenceBps: 8500,
          detail: "Unprotected edge near stair opening.",
        },
      ],
    });

    const observations = parseSiteSnapObservations(output);

    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({
      category: "safety_issue",
      confidenceBps: 8500,
    });
  });

  it("falls back to text parsing when JSON is unavailable", () => {
    const observations = parseSiteSnapObservations(
      "Potential safety hazard from exposed wiring near wet area.",
    );

    expect(observations.length).toBeGreaterThan(0);
    expect(observations[0]?.category).toBe("safety_issue");
  });
});
