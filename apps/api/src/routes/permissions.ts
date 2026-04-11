import { Router } from "express";
import {
  assignRoleController,
  bootstrapPermissionsController,
  checkPermissionController,
  createRoleController,
  deleteRoleController,
  getRoleController,
  listPermissionCatalogController,
  listRoleAssignmentsController,
  listRolePermissionsController,
  listRolesController,
  removeRoleAssignmentController,
  resolveEffectivePermissionsController,
  setRolePermissionsController,
  updateRoleController,
} from "../controllers/permission";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams, validateQuery } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import { requireOrgRole } from "../middleware/require-role";
import {
  assignRoleSchema,
  assignmentIdParamsSchema,
  bootstrapPermissionsSchema,
  checkPermissionSchema,
  createRoleSchema,
  listAssignmentsQuerySchema,
  listRolesQuerySchema,
  resolvePermissionsQuerySchema,
  roleIdParamsSchema,
  setRolePermissionsSchema,
  updateRoleSchema,
} from "../schemas/permission.schema";

export const permissionsRouter: import("express").Router = Router();

permissionsRouter.use(requireAuth);

permissionsRouter.get(
  "/catalog",
  asyncHandler(listPermissionCatalogController),
);
permissionsRouter.post(
  "/bootstrap",
  requireOrgRole("owner", "admin"),
  validateBody(bootstrapPermissionsSchema),
  asyncHandler(bootstrapPermissionsController),
);

permissionsRouter.get(
  "/roles",
  validateQuery(listRolesQuerySchema),
  asyncHandler(listRolesController),
);
permissionsRouter.post(
  "/roles",
  requireOrgRole("owner", "admin"),
  validateBody(createRoleSchema),
  asyncHandler(createRoleController),
);
permissionsRouter.get(
  "/roles/:roleId",
  validateParams(roleIdParamsSchema),
  asyncHandler(getRoleController),
);
permissionsRouter.patch(
  "/roles/:roleId",
  requireOrgRole("owner", "admin"),
  validateParams(roleIdParamsSchema),
  validateBody(updateRoleSchema),
  asyncHandler(updateRoleController),
);
permissionsRouter.delete(
  "/roles/:roleId",
  requireOrgRole("owner", "admin"),
  validateParams(roleIdParamsSchema),
  asyncHandler(deleteRoleController),
);

permissionsRouter.get(
  "/roles/:roleId/permissions",
  validateParams(roleIdParamsSchema),
  asyncHandler(listRolePermissionsController),
);
permissionsRouter.put(
  "/roles/:roleId/permissions",
  requireOrgRole("owner", "admin"),
  validateParams(roleIdParamsSchema),
  validateBody(setRolePermissionsSchema),
  asyncHandler(setRolePermissionsController),
);

permissionsRouter.get(
  "/assignments",
  validateQuery(listAssignmentsQuerySchema),
  asyncHandler(listRoleAssignmentsController),
);
permissionsRouter.post(
  "/assignments",
  requireOrgRole("owner", "admin"),
  validateBody(assignRoleSchema),
  asyncHandler(assignRoleController),
);
permissionsRouter.delete(
  "/assignments/:assignmentId",
  requireOrgRole("owner", "admin"),
  validateParams(assignmentIdParamsSchema),
  asyncHandler(removeRoleAssignmentController),
);

permissionsRouter.get(
  "/effective",
  validateQuery(resolvePermissionsQuerySchema),
  asyncHandler(resolveEffectivePermissionsController),
);
permissionsRouter.post(
  "/check",
  validateBody(checkPermissionSchema),
  asyncHandler(checkPermissionController),
);
