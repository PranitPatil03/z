import type { Request, Response } from "express";
import { permissionService } from "../services/permission";

export async function listPermissionCatalogController(
  _request: Request,
  response: Response,
) {
  const data = await permissionService.listCatalog();
  response.json({ data });
}

export async function bootstrapPermissionsController(
  request: Request,
  response: Response,
) {
  const data = await permissionService.bootstrapPermissions(request);
  response.json({ data });
}

export async function listRolesController(
  request: Request,
  response: Response,
) {
  const data = await permissionService.listRoles(request);
  response.json({ data });
}

export async function getRoleController(request: Request, response: Response) {
  const data = await permissionService.getRole(request);
  response.json({ data });
}

export async function createRoleController(
  request: Request,
  response: Response,
) {
  const data = await permissionService.createRole(request);
  response.status(201).json({ data });
}

export async function updateRoleController(
  request: Request,
  response: Response,
) {
  const data = await permissionService.updateRole(request);
  response.json({ data });
}

export async function deleteRoleController(
  request: Request,
  response: Response,
) {
  const data = await permissionService.deleteRole(request);
  response.json({ data });
}

export async function listRolePermissionsController(
  request: Request,
  response: Response,
) {
  const data = await permissionService.listRolePermissions(request);
  response.json({ data });
}

export async function setRolePermissionsController(
  request: Request,
  response: Response,
) {
  const data = await permissionService.setRolePermissions(request);
  response.json({ data });
}

export async function listRoleAssignmentsController(
  request: Request,
  response: Response,
) {
  const data = await permissionService.listAssignments(request);
  response.json({ data });
}

export async function assignRoleController(
  request: Request,
  response: Response,
) {
  const data = await permissionService.assignRole(request);
  response.status(201).json({ data });
}

export async function removeRoleAssignmentController(
  request: Request,
  response: Response,
) {
  const data = await permissionService.removeAssignment(request);
  response.json({ data });
}

export async function resolveEffectivePermissionsController(
  request: Request,
  response: Response,
) {
  const data = await permissionService.resolvePermissions(request);
  response.json({ data });
}

export async function checkPermissionController(
  request: Request,
  response: Response,
) {
  const data = await permissionService.checkPermission(request);
  response.json({ data });
}
