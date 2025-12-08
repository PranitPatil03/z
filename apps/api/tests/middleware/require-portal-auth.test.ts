import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/lib/errors";

const { verifyTokenMock } = vi.hoisted(() => ({
  verifyTokenMock: vi.fn(),
}));

vi.mock("../../src/services/portal-auth", () => ({
  portalAuthService: {
    verifyToken: verifyTokenMock,
  },
}));

import { requirePortalAuth } from "../../src/middleware/require-portal-auth";

describe("requirePortalAuth middleware", () => {
  beforeEach(() => {
    verifyTokenMock.mockReset();
  });

  it("throws unauthorized when authorization header is missing", async () => {
    const request = { headers: {} } as Request;
    const next = vi.fn() as NextFunction;

    await expect(requirePortalAuth(request, {} as Response, next)).rejects.toBeInstanceOf(AppError);
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches portal session for valid bearer token", async () => {
    const session = {
      subcontractorId: "sub-1",
      email: "sub@example.com",
      name: "Sub Contractor",
      organizationId: "org-1",
      iat: 1,
      exp: 999999,
    };

    verifyTokenMock.mockResolvedValue(session);

    const request = {
      headers: { authorization: "Bearer token-123" },
    } as unknown as Request;
    const next = vi.fn() as NextFunction;

    await requirePortalAuth(request, {} as Response, next);

    expect(verifyTokenMock).toHaveBeenCalledWith("token-123");
    expect((request as any).portalSession).toEqual(session);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("propagates token verification errors", async () => {
    const tokenError = new Error("Invalid token");
    verifyTokenMock.mockRejectedValue(tokenError);

    const request = {
      headers: { authorization: "Bearer invalid-token" },
    } as unknown as Request;
    const next = vi.fn() as NextFunction;

    await expect(requirePortalAuth(request, {} as Response, next)).rejects.toThrow("Invalid token");
    expect(next).not.toHaveBeenCalled();
  });
});
