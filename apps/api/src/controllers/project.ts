import type { Request, Response } from "express";
import { projectService } from "../services/project";

export async function listProjectsController(request: Request, response: Response) {
  const data = await projectService.listProjects(request);
  response.json({ data });
}

export async function createProjectController(request: Request, response: Response) {
  const data = await projectService.createProject(request);
  response.status(201).json({ data });
}

export async function getProjectController(request: Request, response: Response) {
  const data = await projectService.getProject(request);
  response.json({ data });
}

export async function updateProjectController(request: Request, response: Response) {
  const data = await projectService.updateProject(request);
  response.json({ data });
}

export async function archiveProjectController(request: Request, response: Response) {
  const data = await projectService.archiveProject(request);
  response.json({ data });
}
