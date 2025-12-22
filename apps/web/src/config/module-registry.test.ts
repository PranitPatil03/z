import { describe, expect, it } from "vitest";
import { moduleRegistry } from "./module-registry";

describe("moduleRegistry", () => {
  it("contains unique module keys", () => {
    const keys = moduleRegistry.map((module) => module.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it("contains unique route paths", () => {
    const routes = moduleRegistry.map((module) => module.routePath);
    const uniqueRoutes = new Set(routes);
    expect(uniqueRoutes.size).toBe(routes.length);
  });
});
