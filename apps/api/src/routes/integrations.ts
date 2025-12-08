import { Router } from "express";
import {
	createIntegrationController,
	disconnectIntegrationController,
	getIntegrationController,
	listIntegrationsController,
	updateIntegrationController,
} from "../controllers/integration";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import { createIntegrationSchema, integrationIdParamsSchema, updateIntegrationSchema } from "../schemas/integration.schema";

export const integrationsRouter: import("express").Router = Router();

integrationsRouter.use(requireAuth);

integrationsRouter.get("/", asyncHandler(listIntegrationsController));
integrationsRouter.post("/", validateBody(createIntegrationSchema), asyncHandler(createIntegrationController));
integrationsRouter.get("/:integrationId", validateParams(integrationIdParamsSchema), asyncHandler(getIntegrationController));
integrationsRouter.patch(
	"/:integrationId",
	validateParams(integrationIdParamsSchema),
	validateBody(updateIntegrationSchema),
	asyncHandler(updateIntegrationController),
);
integrationsRouter.post(
	"/:integrationId/disconnect",
	validateParams(integrationIdParamsSchema),
	asyncHandler(disconnectIntegrationController),
);
