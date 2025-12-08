import { describe, expect, it } from "vitest";
import { calculateVariance } from "./index";

describe("domain package", () => {
  it("calculates positive variance", () => {
    expect(calculateVariance(1000, 800)).toBe(200);
  });

  it("calculates negative variance", () => {
    expect(calculateVariance(1000, 1200)).toBe(-200);
  });
});
