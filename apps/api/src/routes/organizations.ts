import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { requireAuth } from "../middleware/require-auth";
import { validateBody, validateParams, validateQuery } from "../lib/validate";
import {
	acceptInvitationController,
	addMemberController,
	addTeamMemberController,
	cancelInvitationController,
	checkOrganizationSlugController,
	createOrganizationController,
	createTeamController,
	deleteOrganizationController,
	getActiveMemberController,
	getActiveMemberRoleController,
	getInvitationController,
	getOrganizationController,
	inviteMemberController,
	leaveOrganizationController,
	listInvitationsController,
	listMembersController,
	listOrganizationTeamsController,
	listOrganizationsController,
	listTeamMembersController,
	listUserInvitationsController,
	listUserTeamsController,
	rejectInvitationController,
	removeMemberController,
	removeTeamController,
	removeTeamMemberController,
	setActiveOrganizationController,
	setActiveTeamController,
	updateMemberRoleController,
	updateOrganizationController,
	updateTeamController,
} from "../controllers/organization";
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
	organizationMemberParamsSchema,
	organizationIdParamsSchema,
	setActiveOrganizationSchema,
	setActiveTeamSchema,
	teamIdParamsSchema,
	teamMemberParamsSchema,
	updateMemberRoleSchema,
	updateOrganizationSchema,
	updateTeamSchema,
} from "../schemas/organization.schema";

export const organizationsRouter = Router();

organizationsRouter.use(requireAuth);

organizationsRouter.get("/", asyncHandler(listOrganizationsController));
organizationsRouter.post("/", validateBody(createOrganizationSchema), asyncHandler(createOrganizationController));
organizationsRouter.post("/check-slug", validateBody(checkOrganizationSlugSchema), asyncHandler(checkOrganizationSlugController));
organizationsRouter.post("/leave", validateBody(leaveOrganizationSchema), asyncHandler(leaveOrganizationController));
organizationsRouter.post("/active", validateBody(setActiveOrganizationSchema), asyncHandler(setActiveOrganizationController));
organizationsRouter.get("/active-member", validateQuery(activeMemberQuerySchema), asyncHandler(getActiveMemberController));
organizationsRouter.get("/active-member-role", validateQuery(activeMemberQuerySchema), asyncHandler(getActiveMemberRoleController));

organizationsRouter.get("/user-invitations", asyncHandler(listUserInvitationsController));
organizationsRouter.get("/invitations", validateQuery(listInvitationsQuerySchema), asyncHandler(listInvitationsController));
organizationsRouter.get("/invitations/:invitationId", validateParams(invitationIdParamsSchema), asyncHandler(getInvitationController));
organizationsRouter.post("/invitations/:invitationId/accept", validateParams(invitationIdParamsSchema), asyncHandler(acceptInvitationController));
organizationsRouter.post("/invitations/:invitationId/reject", validateParams(invitationIdParamsSchema), asyncHandler(rejectInvitationController));
organizationsRouter.delete("/invitations/:invitationId", validateParams(invitationIdParamsSchema), asyncHandler(cancelInvitationController));

organizationsRouter.get("/teams/user", asyncHandler(listUserTeamsController));
organizationsRouter.post("/teams/active", validateBody(setActiveTeamSchema), asyncHandler(setActiveTeamController));
organizationsRouter.patch("/teams/:teamId", validateParams(teamIdParamsSchema), validateBody(updateTeamSchema), asyncHandler(updateTeamController));
organizationsRouter.delete("/teams/:teamId", validateParams(teamIdParamsSchema), asyncHandler(removeTeamController));
organizationsRouter.get("/teams/:teamId/members", validateParams(teamIdParamsSchema), asyncHandler(listTeamMembersController));
organizationsRouter.post("/teams/:teamId/members", validateParams(teamIdParamsSchema), validateBody(addTeamMemberSchema), asyncHandler(addTeamMemberController));
organizationsRouter.delete("/teams/:teamId/members/:userId", validateParams(teamMemberParamsSchema), asyncHandler(removeTeamMemberController));

organizationsRouter.get("/:organizationId", validateParams(organizationIdParamsSchema), asyncHandler(getOrganizationController));
organizationsRouter.patch("/:organizationId", validateBody(updateOrganizationSchema), validateParams(organizationIdParamsSchema), asyncHandler(updateOrganizationController));
organizationsRouter.delete("/:organizationId", validateParams(organizationIdParamsSchema), asyncHandler(deleteOrganizationController));
organizationsRouter.get("/:organizationId/members", validateParams(organizationIdParamsSchema), asyncHandler(listMembersController));
organizationsRouter.post("/:organizationId/members", validateParams(organizationIdParamsSchema), validateBody(addMemberSchema), asyncHandler(addMemberController));
organizationsRouter.patch("/:organizationId/members/:memberId/role", validateParams(organizationMemberParamsSchema), validateBody(updateMemberRoleSchema), asyncHandler(updateMemberRoleController));
organizationsRouter.delete("/:organizationId/members/:memberId", validateParams(organizationMemberParamsSchema), asyncHandler(removeMemberController));
organizationsRouter.post("/:organizationId/invitations", validateBody(inviteMemberSchema), validateParams(organizationIdParamsSchema), asyncHandler(inviteMemberController));
organizationsRouter.post("/:organizationId/teams", validateParams(organizationIdParamsSchema), validateBody(createTeamSchema), asyncHandler(createTeamController));
organizationsRouter.get("/:organizationId/teams", validateParams(organizationIdParamsSchema), asyncHandler(listOrganizationTeamsController));
