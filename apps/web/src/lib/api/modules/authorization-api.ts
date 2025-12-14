import { ApiRequestError, requestJson } from "@/lib/api/http-client";

export type ActiveOrgRole = "owner" | "admin" | "member" | string;

function extractRole(payload: unknown): ActiveOrgRole | null {
  if (typeof payload === "string") {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  if ("role" in payload && typeof payload.role === "string") {
    return payload.role;
  }

  if ("data" in payload) {
    return extractRole(payload.data);
  }

  return null;
}

export const authorizationApi = {
  async getActiveMemberRole(organizationId?: string) {
    const search = new URLSearchParams();
    if (organizationId) {
      search.set("organizationId", organizationId);
    }

    const suffix = search.size > 0 ? `?${search.toString()}` : "";
    try {
      const payload = await requestJson<unknown>(
        `/organizations/active-member-role${suffix}`,
      );
      return extractRole(payload);
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        (error.code === "NO_ACTIVE_ORGANIZATION" ||
          (error.status === 400 &&
            error.message.toLowerCase().includes("active organization")))
      ) {
        return null;
      }

      throw error;
    }
  },

  async checkPermission(permissionKey: string, projectId?: string) {
    try {
      const payload = await requestJson<{
        data: {
          allowed: boolean;
        };
      }>("/permissions/check", {
        method: "POST",
        body: {
          permissionKey,
          projectId,
        },
      });

      return payload.data.allowed;
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        (error.code === "NO_ACTIVE_ORGANIZATION" ||
          (error.status === 400 &&
            error.message.toLowerCase().includes("active organization")))
      ) {
        return false;
      }

      throw error;
    }
  },
};
