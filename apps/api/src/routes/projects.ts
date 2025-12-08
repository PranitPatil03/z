import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { requireAuth } from "../middleware/require-auth";
import { requireOrgRole } from "../middleware/require-role";
import { validateBody, validateParams } from "../lib/validate";
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

projectsRouter.get("/", asyncHandler(listProjectsController));
projectsRouter.post("/", validateBody(createProjectSchema), asyncHandler(createProjectController));
projectsRouter.get("/:projectId", validateParams(projectIdParamsSchema), asyncHandler(getProjectController));
projectsRouter.patch("/:projectId", validateBody(updateProjectSchema), validateParams(projectIdParamsSchema), asyncHandler(updateProjectController));
projectsRouter.delete("/:projectId", validateParams(projectIdParamsSchema), asyncHandler(archiveProjectController));

projectsRouter.get(
	"/:projectId/members",
	validateParams(projectMembersParamsSchema),
	asyncHandler(listProjectMembersController),
);

projectsRouter.post(
	"/:projectId/members",
	requireOrgRole("owner", "admin"),
	validateParams(projectMembersParamsSchema),
	validateBody(createProjectMemberSchema),
	asyncHandler(createProjectMemberController),
);

projectsRouter.patch(
	"/:projectId/members/:userId",
	requireOrgRole("owner", "admin"),
	validateParams(projectMemberParamsSchema),
	validateBody(updateProjectMemberSchema),
	asyncHandler(updateProjectMemberController),
);

projectsRouter.delete(
	"/:projectId/members/:userId",
	requireOrgRole("owner", "admin"),
	validateParams(projectMemberParamsSchema),
	asyncHandler(removeProjectMemberController),
);
