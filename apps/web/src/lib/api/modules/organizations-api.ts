import { requestData, requestDataWithInit } from "./_shared";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface OrgMember {
  id: string;
  userId: string;
  organizationId?: string;
  role: "owner" | "admin" | "member";
  createdAt?: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

export interface CreateOrgInput {
  name: string;
  slug: string;
}

export interface InviteMemberInput {
  email: string;
  role: "owner" | "admin" | "member";
}

export const organizationsApi = {
  list: () => requestData<Organization[]>("/organizations"),

  get: (id: string) => requestData<Organization>(`/organizations/${id}`),

  create: (body: CreateOrgInput) =>
    requestDataWithInit<Organization>("/organizations", {
      method: "POST",
      body,
    }),

  delete: (id: string) =>
    requestDataWithInit<void>(`/organizations/${id}`, { method: "DELETE" }),

  setActive: (organizationId: string) =>
    requestDataWithInit<void>("/organizations/active", {
      method: "POST",
      body: { organizationId },
    }),

  listMembers: async (orgId: string) => {
    const payload = await requestData<
      OrgMember[] | { members?: OrgMember[] }
    >(`/organizations/${orgId}/members`);

    if (Array.isArray(payload)) {
      return payload;
    }

    return payload.members ?? [];
  },

  inviteMember: (orgId: string, body: InviteMemberInput) =>
    requestDataWithInit<void>(`/organizations/${orgId}/invitations`, {
      method: "POST",
      body,
    }),

  removeMember: (orgId: string, memberId: string) =>
    requestDataWithInit<void>(`/organizations/${orgId}/members/${memberId}`, {
      method: "DELETE",
    }),

  updateMemberRole: (
    orgId: string,
    memberId: string,
    role: "owner" | "admin" | "member",
  ) =>
    requestDataWithInit<OrgMember>(
      `/organizations/${orgId}/members/${memberId}/role`,
      {
        method: "PATCH",
        body: { role },
      },
    ),

  getActiveMemberRole: (organizationId?: string) =>
    requestData<{ role: "owner" | "admin" | "member" | string }>(
      organizationId
        ? `/organizations/active-member-role?organizationId=${encodeURIComponent(organizationId)}`
        : "/organizations/active-member-role",
    ),
};
