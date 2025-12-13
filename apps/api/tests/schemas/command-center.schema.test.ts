import { describe, expect, it } from "vitest";
import {
  commandCenterHealthQuerySchema,
  commandCenterOverviewQuerySchema,
  commandCenterPortfolioQuerySchema,
} from "../../src/schemas/command-center.schema";

describe("command center schemas", () => {
  it("applies default window for overview", () => {
    const parsed = commandCenterOverviewQuerySchema.parse({ projectId: "proj-1" });

    expect(parsed.windowDays).toBe(30);
  });

  it("validates health query projectId and window bounds", () => {
    expect(() => commandCenterHealthQuerySchema.parse({ projectId: "" })).toThrow();
    expect(() => commandCenterHealthQuerySchema.parse({ projectId: "proj-1", windowDays: 365 })).toThrow();
  });

  it("applies portfolio defaults", () => {
    const parsed = commandCenterPortfolioQuerySchema.parse({});

    expect(parsed.limit).toBe(10);
    expect(parsed.windowDays).toBe(30);
  });
});
