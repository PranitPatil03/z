import { describe, expect, it } from "vitest";
import { healthService } from "../../src/services/health";

describe("healthService", () => {
  it("returns API health details", () => {
    const result = healthService();

    expect(result.status).toBe("ok");
    expect(result.service).toBe("api");
    expect(typeof result.time).toBe("string");
    expect(Number.isNaN(Date.parse(result.time))).toBe(false);
  });
});
