import type { Request, Response } from "express";
import { organizationService } from "../services/organization";

export async function listOrganizationsController(request: Request, response: Response) {
  const data = await organizationService.listOrganizations(request);
  response.json({ data });
}

export async function createOrganizationController(request: Request, response: Response) {
  const data = await organizationService.createOrganization(request);
  response.status(201).json({ data });
}

export async function getOrganizationController(request: Request, response: Response) {
  const data = await organizationService.getFullOrganization(request);
  response.json({ data });
}

export async function updateOrganizationController(request: Request, response: Response) {
  const data = await organizationService.updateOrganization(request);
  response.json({ data });
}

export async function deleteOrganizationController(request: Request, response: Response) {
  const data = await organizationService.deleteOrganization(request);
  response.json({ data });
}

export async function listMembersController(request: Request, response: Response) {
  const data = await organizationService.listMembers(request);
  response.json({ data });
}

export async function inviteMemberController(request: Request, response: Response) {
  const data = await organizationService.createInvitation(request);
  response.status(201).json({ data });
}

export async function setActiveOrganizationController(request: Request, response: Response) {
  const data = await organizationService.setActiveOrganization(request);
  response.json({ data });
}

export async function checkOrganizationSlugController(request: Request, response: Response) {
  const data = await organizationService.checkOrganizationSlug(request);
  response.json({ data });
}

export async function addMemberController(request: Request, response: Response) {
  const data = await organizationService.addMember(request);
  response.status(201).json({ data });
}

export async function updateMemberRoleController(request: Request, response: Response) {
  const data = await organizationService.updateMemberRole(request);
  response.json({ data });
}

export async function removeMemberController(request: Request, response: Response) {
  const data = await organizationService.removeMember(request);
  response.json({ data });
}

export async function leaveOrganizationController(request: Request, response: Response) {
  const data = await organizationService.leaveOrganization(request);
  response.json({ data });
}

export async function listInvitationsController(request: Request, response: Response) {
  const data = await organizationService.listInvitations(request);
  response.json({ data });
}

export async function listUserInvitationsController(request: Request, response: Response) {
  const data = await organizationService.listUserInvitations(request);
  response.json({ data });
}

export async function getInvitationController(request: Request, response: Response) {
  const data = await organizationService.getInvitation(request);
  response.json({ data });
}

export async function acceptInvitationController(request: Request, response: Response) {
  const data = await organizationService.acceptInvitation(request);
  response.json({ data });
}

export async function rejectInvitationController(request: Request, response: Response) {
  const data = await organizationService.rejectInvitation(request);
  response.json({ data });
}

export async function cancelInvitationController(request: Request, response: Response) {
  const data = await organizationService.cancelInvitation(request);
  response.json({ data });
}

export async function getActiveMemberController(request: Request, response: Response) {
  const data = await organizationService.getActiveMember(request);
  response.json({ data });
}

export async function getActiveMemberRoleController(request: Request, response: Response) {
  const data = await organizationService.getActiveMemberRole(request);
  response.json({ data });
}

export async function createTeamController(request: Request, response: Response) {
  const data = await organizationService.createTeam(request);
  response.status(201).json({ data });
}

export async function listOrganizationTeamsController(request: Request, response: Response) {
  const data = await organizationService.listOrganizationTeams(request);
  response.json({ data });
}

export async function updateTeamController(request: Request, response: Response) {
  const data = await organizationService.updateTeam(request);
  response.json({ data });
}

export async function removeTeamController(request: Request, response: Response) {
  const data = await organizationService.removeTeam(request);
  response.json({ data });
}

export async function setActiveTeamController(request: Request, response: Response) {
  const data = await organizationService.setActiveTeam(request);
  response.json({ data });
}

export async function listUserTeamsController(request: Request, response: Response) {
  const data = await organizationService.listUserTeams(request);
  response.json({ data });
}

export async function listTeamMembersController(request: Request, response: Response) {
  const data = await organizationService.listTeamMembers(request);
  response.json({ data });
}

export async function addTeamMemberController(request: Request, response: Response) {
  const data = await organizationService.addTeamMember(request);
  response.status(201).json({ data });
}

export async function removeTeamMemberController(request: Request, response: Response) {
  const data = await organizationService.removeTeamMember(request);
  response.json({ data });
}
