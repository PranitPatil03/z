import { Router } from "express";
import {
	archiveComplianceItemController,
	createComplianceItemController,
	getComplianceItemController,
	listComplianceItemsController,
	updateComplianceItemController,
} from "../controllers/compliance";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import {
	complianceItemIdParamsSchema,
	createComplianceItemSchema,
	updateComplianceItemSchema,
} from "../schemas/compliance.schema";

export const complianceRouter = Router();

complianceRouter.use(requireAuth);

complianceRouter.get("/", asyncHandler(listComplianceItemsController));
complianceRouter.post("/", validateBody(createComplianceItemSchema), asyncHandler(createComplianceItemController));
complianceRouter.get(
	"/:complianceItemId",
	validateParams(complianceItemIdParamsSchema),
	asyncHandler(getComplianceItemController),
);
complianceRouter.patch(
	"/:complianceItemId",
	validateParams(complianceItemIdParamsSchema),
	validateBody(updateComplianceItemSchema),
	asyncHandler(updateComplianceItemController),
);
complianceRouter.delete(
	"/:complianceItemId",
	validateParams(complianceItemIdParamsSchema),
	asyncHandler(archiveComplianceItemController),
);
