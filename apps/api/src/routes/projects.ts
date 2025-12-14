import { Router } from "express";
import {
  archiveProjectController,
  createProjectController,
  createProjectMemberController,
  getProjectController,
  listProjectMembersController,
  listProjectsController,
  removeProjectMemberController,
  updateProjectController,
  updateProjectMemberController,
} from "../controllers/project";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import { requirePermission } from "../middleware/require-role";
import {
  createProjectMemberSchema,
  createProjectSchema,
  projectIdParamsSchema,
  projectMemberParamsSchema,
  projectMembersParamsSchema,
  updateProjectMemberSchema,
  updateProjectSchema,
} from "../schemas/project.schema";

export const projectsRouter: import("express").Router = Router();

projectsRouter.use(requireAuth);

projectsRouter.get(
  "/",
  requirePermission("project.read"),
  asyncHandler(listProjectsController),
);
projectsRouter.post(
  "/",
  requirePermission("project.create"),
  validateBody(createProjectSchema),
  asyncHandler(createProjectController),
);
projectsRouter.get(
  "/:projectId",
  requirePermission("project.read", { projectIdParam: "projectId" }),
  validateParams(projectIdParamsSchema),
  asyncHandler(getProjectController),
);
projectsRouter.patch(
  "/:projectId",
  requirePermission("project.update", { projectIdParam: "projectId" }),
  validateBody(updateProjectSchema),
  validateParams(projectIdParamsSchema),
  asyncHandler(updateProjectController),
);
projectsRouter.delete(
  "/:projectId",
  requirePermission("project.archive", { projectIdParam: "projectId" }),
  validateParams(projectIdParamsSchema),
  asyncHandler(archiveProjectController),
);

projectsRouter.get(
  "/:projectId/members",
  requirePermission("project.member.read", { projectIdParam: "projectId" }),
  validateParams(projectMembersParamsSchema),
  asyncHandler(listProjectMembersController),
);

projectsRouter.post(
  "/:projectId/members",
  requirePermission("project.member.manage", { projectIdParam: "projectId" }),
  validateParams(projectMembersParamsSchema),
  validateBody(createProjectMemberSchema),
  asyncHandler(createProjectMemberController),
);

projectsRouter.patch(
  "/:projectId/members/:userId",
  requirePermission("project.member.manage", { projectIdParam: "projectId" }),
  validateParams(projectMemberParamsSchema),
  validateBody(updateProjectMemberSchema),
  asyncHandler(updateProjectMemberController),
);

projectsRouter.delete(
  "/:projectId/members/:userId",
  requirePermission("project.member.manage", { projectIdParam: "projectId" }),
  validateParams(projectMemberParamsSchema),
  asyncHandler(removeProjectMemberController),
);
