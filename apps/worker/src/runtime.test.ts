import { describe, expect, it } from "vitest";
import { resolveWorkerMode } from "./runtime";

describe("resolveWorkerMode", () => {
  it("returns idle when REDIS_URL is missing", () => {
    expect(resolveWorkerMode(undefined)).toBe("idle");
    expect(resolveWorkerMode("")).toBe("idle");
  });

  it("returns active when REDIS_URL is provided", () => {
    expect(resolveWorkerMode("redis://localhost:6379")).toBe("active");
  });
});
