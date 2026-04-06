import { Router } from "express";
import {
	archiveRfqController,
	createRfqController,
	getRfqController,
	listRfqsController,
	updateRfqController,
} from "../controllers/rfq";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import { createRfqSchema, rfqIdParamsSchema, updateRfqSchema } from "../schemas/rfq.schema";

export const rfqsRouter: import("express").Router = Router();

rfqsRouter.use(requireAuth);

rfqsRouter.get("/", asyncHandler(listRfqsController));
rfqsRouter.post("/", validateBody(createRfqSchema), asyncHandler(createRfqController));
rfqsRouter.get("/:rfqId", validateParams(rfqIdParamsSchema), asyncHandler(getRfqController));
rfqsRouter.patch(
	"/:rfqId",
	validateParams(rfqIdParamsSchema),
	validateBody(updateRfqSchema),
	asyncHandler(updateRfqController),
);
rfqsRouter.delete("/:rfqId", validateParams(rfqIdParamsSchema), asyncHandler(archiveRfqController));
