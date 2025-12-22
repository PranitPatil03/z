import { describe, expect, it } from "vitest";
import {
  formatPortalCents,
  parseCommaSeparated,
  toIsoOrUndefined,
} from "./portal-utils";

describe("portal utils", () => {
  it("formats cents as usd currency", () => {
    expect(formatPortalCents(12345)).toBe("$123.45");
  });

  it("parses comma separated inputs", () => {
    expect(parseCommaSeparated("A, B, A, C")).toEqual(["A", "B", "C"]);
  });

  it("returns undefined for invalid datetime", () => {
    expect(toIsoOrUndefined("not-a-date")).toBeUndefined();
    expect(toIsoOrUndefined("")).toBeUndefined();
  });
});
