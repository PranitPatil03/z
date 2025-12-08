import { Router } from "express";
import {
	archiveSubcontractorController,
	createSubcontractorController,
	getSubcontractorController,
	listSubcontractorsController,
	updateSubcontractorController,
} from "../controllers/subcontractor";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import {
	createSubcontractorSchema,
	subcontractorIdParamsSchema,
	updateSubcontractorSchema,
} from "../schemas/subcontractor.schema";

export const subcontractorsRouter = Router();

subcontractorsRouter.use(requireAuth);

subcontractorsRouter.get("/", asyncHandler(listSubcontractorsController));
subcontractorsRouter.post("/", validateBody(createSubcontractorSchema), asyncHandler(createSubcontractorController));
subcontractorsRouter.get(
	"/:subcontractorId",
	validateParams(subcontractorIdParamsSchema),
	asyncHandler(getSubcontractorController),
);
subcontractorsRouter.patch(
	"/:subcontractorId",
	validateParams(subcontractorIdParamsSchema),
	validateBody(updateSubcontractorSchema),
	asyncHandler(updateSubcontractorController),
);
subcontractorsRouter.delete(
	"/:subcontractorId",
	validateParams(subcontractorIdParamsSchema),
	asyncHandler(archiveSubcontractorController),
);
