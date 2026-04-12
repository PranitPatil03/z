import { describe, expect, it } from "vitest";
import {
  isInternalProtectedPath,
  isInternalPublicPath,
  isPortalProtectedPath,
  isPortalPublicPath,
  isStaticOrSystemPath,
} from "./route-guards";

describe("route guards", () => {
  it("detects static and Next.js system routes", () => {
    expect(isStaticOrSystemPath("/_next/static/chunk.js")).toBe(true);
    expect(isStaticOrSystemPath("/api/health")).toBe(true);
    expect(isStaticOrSystemPath("/favicon.ico")).toBe(true);
    expect(isStaticOrSystemPath("/projects")).toBe(false);
  });

  it("marks internal public and protected paths", () => {
    expect(isInternalPublicPath("/login")).toBe(true);
    expect(isInternalPublicPath("/portal/login")).toBe(true);
    expect(isInternalPublicPath("/portal/register")).toBe(true);
    expect(isInternalPublicPath("/portal/forgot-password")).toBe(true);
    expect(isInternalPublicPath("/projects")).toBe(false);

    expect(isInternalProtectedPath("/dashboard")).toBe(true);
    expect(isInternalProtectedPath("/projects")).toBe(true);
    expect(isInternalProtectedPath("/portal/overview")).toBe(false);
  });

  it("marks portal public and protected paths", () => {
    expect(isPortalPublicPath("/portal")).toBe(true);
    expect(isPortalPublicPath("/portal/login")).toBe(true);
    expect(isPortalPublicPath("/portal/register")).toBe(true);
    expect(isPortalPublicPath("/portal/invitations/accept")).toBe(true);
    expect(isPortalPublicPath("/portal/reset-password")).toBe(true);
    expect(isPortalPublicPath("/portal/overview")).toBe(false);

    expect(isPortalProtectedPath("/portal/overview")).toBe(true);
    expect(isPortalProtectedPath("/portal/profile")).toBe(true);
    expect(isPortalProtectedPath("/portal/login")).toBe(false);
  });
});
