import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";
import { auth } from "../auth";
import type { ValidatedRequest } from "../lib/validate";
import {
  activeMemberQuerySchema,
  addMemberSchema,
  addTeamMemberSchema,
  checkOrganizationSlugSchema,
  createOrganizationSchema,
  createTeamSchema,
  invitationIdParamsSchema,
  inviteMemberSchema,
  leaveOrganizationSchema,
  listInvitationsQuerySchema,
  memberIdParamsSchema,
  organizationIdParamsSchema,
  setActiveOrganizationSchema,
  setActiveTeamSchema,
  teamIdParamsSchema,
  teamMemberParamsSchema,
  updateMemberRoleSchema,
  updateOrganizationSchema,
  updateTeamSchema,
} from "../schemas/organization.schema";

function sessionHeaders(request: Request) {
  return fromNodeHeaders(request.headers);
}

function readValidatedBody<T>(request: Request) {
  return (request as ValidatedRequest).validated?.body as T;
}

function readValidatedParams<T>(request: Request) {
  return (request as ValidatedRequest).validated?.params as T;
}

function readValidatedQuery<T>(request: Request) {
  return (request as ValidatedRequest).validated?.query as T;
}

function buildHeaders(request: Request) {
  return sessionHeaders(request);
}

type ApiArg<T extends (...args: never[]) => unknown> = Parameters<T>[0];

export const organizationService = {
  async listOrganizations(request: Request) {
    return await auth.api.listOrganizations({
      headers: buildHeaders(request),
    });
  },

  async createOrganization(request: Request) {
    const body = createOrganizationSchema.parse(readValidatedBody(request));
    return await auth.api.createOrganization({
      headers: buildHeaders(request),
      body: body,
    } as ApiArg<typeof auth.api.createOrganization>);
  },

  async getFullOrganization(request: Request) {
    const params = organizationIdParamsSchema.parse(
      readValidatedParams(request),
    );
    return await auth.api.getFullOrganization({
      headers: buildHeaders(request),
      query: { organizationId: params.organizationId },
    });
  },

  async updateOrganization(request: Request) {
    const params = organizationIdParamsSchema.parse(
      readValidatedParams(request),
    );
    const body = updateOrganizationSchema.parse(readValidatedBody(request));
    return await auth.api.updateOrganization({
      headers: buildHeaders(request),
      query: { organizationId: params.organizationId },
      body: { data: body },
    } as ApiArg<typeof auth.api.updateOrganization>);
  },

  async deleteOrganization(request: Request) {
    const params = organizationIdParamsSchema.parse(
      readValidatedParams(request),
    );
    const result = await auth.api.deleteOrganization({
      headers: buildHeaders(request),
      body: { organizationId: params.organizationId },
    });
    return result;
  },

  async listMembers(request: Request) {
    const params = organizationIdParamsSchema.parse(
      readValidatedParams(request),
    );
    return await auth.api.listMembers({
      headers: buildHeaders(request),
      query: { organizationId: params.organizationId },
    });
  },

  async addMember(request: Request) {
    const params = organizationIdParamsSchema.parse(
      readValidatedParams(request),
    );
    const body = addMemberSchema.parse(readValidatedBody(request));

    return await auth.api.addMember({
      headers: buildHeaders(request),
      body: {
        organizationId: params.organizationId,
        userId: body.userId,
        role: body.role,
      },
    } as ApiArg<typeof auth.api.addMember>);
  },

  async updateMemberRole(request: Request) {
    const org = organizationIdParamsSchema.parse(readValidatedParams(request));
    const member = memberIdParamsSchema.parse(readValidatedParams(request));
    const body = updateMemberRoleSchema.parse(readValidatedBody(request));

    return await auth.api.updateMemberRole({
      headers: buildHeaders(request),
      body: {
        organizationId: org.organizationId,
        memberId: member.memberId,
        role: body.role,
      },
    } as ApiArg<typeof auth.api.updateMemberRole>);
  },

  async removeMember(request: Request) {
    const org = organizationIdParamsSchema.parse(readValidatedParams(request));
    const member = memberIdParamsSchema.parse(readValidatedParams(request));

    return await auth.api.removeMember({
      headers: buildHeaders(request),
      body: {
        organizationId: org.organizationId,
        memberIdOrEmail: member.memberId,
      },
    } as ApiArg<typeof auth.api.removeMember>);
  },

  async leaveOrganization(request: Request) {
    const body = leaveOrganizationSchema.parse(readValidatedBody(request));

    return await auth.api.leaveOrganization({
      headers: buildHeaders(request),
      body,
    });
  },

  async createInvitation(request: Request) {
    const params = organizationIdParamsSchema.parse(
      readValidatedParams(request),
    );
    const body = inviteMemberSchema.parse(readValidatedBody(request));
    return await auth.api.createInvitation({
      headers: buildHeaders(request),
      body: {
        email: body.email,
        role: body.role,
        organizationId: params.organizationId,
        teamId: body.teamId ? [body.teamId] : undefined,
        resend: body.resend,
      },
    });
  },

  async listInvitations(request: Request) {
    const query = listInvitationsQuerySchema.parse(
      readValidatedQuery(request) ?? {},
    );

    return await auth.api.listInvitations({
      headers: buildHeaders(request),
      query,
    } as ApiArg<typeof auth.api.listInvitations>);
  },

  async listUserInvitations(request: Request) {
    return await auth.api.listUserInvitations({
      headers: buildHeaders(request),
    });
  },

  async getInvitation(request: Request) {
    const params = invitationIdParamsSchema.parse(readValidatedParams(request));
    return await auth.api.getInvitation({
      headers: buildHeaders(request),
      query: { id: params.invitationId },
    } as ApiArg<typeof auth.api.getInvitation>);
  },

  async acceptInvitation(request: Request) {
    const params = invitationIdParamsSchema.parse(readValidatedParams(request));
    return await auth.api.acceptInvitation({
      headers: buildHeaders(request),
      body: { invitationId: params.invitationId },
    });
  },

  async rejectInvitation(request: Request) {
    const params = invitationIdParamsSchema.parse(readValidatedParams(request));
    return await auth.api.rejectInvitation({
      headers: buildHeaders(request),
      body: { invitationId: params.invitationId },
    });
  },

  async cancelInvitation(request: Request) {
    const params = invitationIdParamsSchema.parse(readValidatedParams(request));
    return await auth.api.cancelInvitation({
      headers: buildHeaders(request),
      body: { invitationId: params.invitationId },
    });
  },

  async checkOrganizationSlug(request: Request) {
    const body = checkOrganizationSlugSchema.parse(readValidatedBody(request));
    return await auth.api.checkOrganizationSlug({
      headers: buildHeaders(request),
      body,
    });
  },

  async getActiveMember(request: Request) {
    const query = activeMemberQuerySchema.parse(
      readValidatedQuery(request) ?? {},
    );

    return await auth.api.getActiveMember({
      headers: buildHeaders(request),
      query,
    } as ApiArg<typeof auth.api.getActiveMember>);
  },

  async getActiveMemberRole(request: Request) {
    const query = activeMemberQuerySchema.parse(
      readValidatedQuery(request) ?? {},
    );

    return await auth.api.getActiveMemberRole({
      headers: buildHeaders(request),
      query,
    } as ApiArg<typeof auth.api.getActiveMemberRole>);
  },

  async setActiveOrganization(request: Request) {
    const body = setActiveOrganizationSchema.parse(readValidatedBody(request));
    return await auth.api.setActiveOrganization({
      headers: buildHeaders(request),
      body: {
        organizationId: body.organizationId ?? undefined,
      },
    });
  },

  async createTeam(request: Request) {
    const params = organizationIdParamsSchema.parse(
      readValidatedParams(request),
    );
    const body = createTeamSchema.parse(readValidatedBody(request));

    return await auth.api.createTeam({
      headers: buildHeaders(request),
      body: {
        organizationId: params.organizationId,
        name: body.name,
      },
    } as ApiArg<typeof auth.api.createTeam>);
  },

  async listOrganizationTeams(request: Request) {
    const params = organizationIdParamsSchema.parse(
      readValidatedParams(request),
    );
    return await auth.api.listOrganizationTeams({
      headers: buildHeaders(request),
      query: { organizationId: params.organizationId },
    });
  },

  async updateTeam(request: Request) {
    const params = teamIdParamsSchema.parse(readValidatedParams(request));
    const body = updateTeamSchema.parse(readValidatedBody(request));

    return await auth.api.updateTeam({
      headers: buildHeaders(request),
      body: {
        teamId: params.teamId,
        data: {
          name: body.name,
        },
      },
    } as ApiArg<typeof auth.api.updateTeam>);
  },

  async removeTeam(request: Request) {
    const params = teamIdParamsSchema.parse(readValidatedParams(request));
    return await auth.api.removeTeam({
      headers: buildHeaders(request),
      body: { teamId: params.teamId },
    });
  },

  async setActiveTeam(request: Request) {
    const body = setActiveTeamSchema.parse(readValidatedBody(request));
    return await auth.api.setActiveTeam({
      headers: buildHeaders(request),
      body: { teamId: body.teamId ?? undefined },
    });
  },

  async listUserTeams(request: Request) {
    return await auth.api.listUserTeams({
      headers: buildHeaders(request),
    });
  },

  async listTeamMembers(request: Request) {
    const params = teamIdParamsSchema.parse(readValidatedParams(request));
    return await auth.api.listTeamMembers({
      headers: buildHeaders(request),
      query: { teamId: params.teamId },
    });
  },

  async addTeamMember(request: Request) {
    const params = teamIdParamsSchema.parse(readValidatedParams(request));
    const body = addTeamMemberSchema.parse(readValidatedBody(request));

    return await auth.api.addTeamMember({
      headers: buildHeaders(request),
      body: {
        teamId: params.teamId,
        userId: body.userId,
      },
    });
  },

  async removeTeamMember(request: Request) {
    const params = teamMemberParamsSchema.parse(readValidatedParams(request));

    return await auth.api.removeTeamMember({
      headers: buildHeaders(request),
      body: {
        teamId: params.teamId,
        userId: params.userId,
      },
    });
  },
};
