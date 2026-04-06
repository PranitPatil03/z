import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { requireAuth } from "../middleware/require-auth";
import { validateBody, validateParams } from "../lib/validate";
import { archiveProjectController, createProjectController, getProjectController, listProjectsController, updateProjectController } from "../controllers/project";
import { createProjectSchema, projectIdParamsSchema, updateProjectSchema } from "../schemas/project.schema";

export const projectsRouter: import("express").Router = Router();

projectsRouter.use(requireAuth);

projectsRouter.get("/", asyncHandler(listProjectsController));
projectsRouter.post("/", validateBody(createProjectSchema), asyncHandler(createProjectController));
projectsRouter.get("/:projectId", validateParams(projectIdParamsSchema), asyncHandler(getProjectController));
projectsRouter.patch("/:projectId", validateBody(updateProjectSchema), validateParams(projectIdParamsSchema), asyncHandler(updateProjectController));
projectsRouter.delete("/:projectId", validateParams(projectIdParamsSchema), asyncHandler(archiveProjectController));
