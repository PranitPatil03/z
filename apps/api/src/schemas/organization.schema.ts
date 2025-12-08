import { z } from "zod";

const roleSchema = z.enum(["member", "admin", "owner"]);

export const organizationIdParamsSchema = z.object({
  organizationId: z.string().min(1),
});

export const memberIdParamsSchema = z.object({
  memberId: z.string().min(1),
});

export const organizationMemberParamsSchema = z.object({
  organizationId: z.string().min(1),
  memberId: z.string().min(1),
});

export const invitationIdParamsSchema = z.object({
  invitationId: z.string().min(1),
});

export const teamIdParamsSchema = z.object({
  teamId: z.string().min(1),
});

export const teamMemberParamsSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
});

export const createOrganizationSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  logo: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  logo: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: roleSchema,
  teamId: z.string().optional(),
  resend: z.boolean().optional(),
});

export const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: roleSchema.default("member"),
});

export const updateMemberRoleSchema = z.object({
  role: roleSchema,
});

export const checkOrganizationSlugSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
});

export const setActiveOrganizationSchema = z.object({
  organizationId: z.string().min(1).optional(),
});

export const leaveOrganizationSchema = z.object({
  organizationId: z.string().min(1),
});

export const listInvitationsQuerySchema = z.object({
  organizationId: z.string().min(1).optional(),
});

export const activeMemberQuerySchema = z.object({
  organizationId: z.string().min(1).optional(),
});

export const createTeamSchema = z.object({
  name: z.string().min(2),
});

export const updateTeamSchema = z.object({
  name: z.string().min(2),
});

export const setActiveTeamSchema = z.object({
  teamId: z.string().min(1).optional(),
});

export const addTeamMemberSchema = z.object({
  userId: z.string().min(1),
});
