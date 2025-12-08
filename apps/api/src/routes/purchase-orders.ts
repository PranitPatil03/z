import { Router } from "express";
import {
	archivePurchaseOrderController,
	createPurchaseOrderController,
	getPurchaseOrderController,
	listPurchaseOrdersController,
	updatePurchaseOrderController,
} from "../controllers/purchase-order";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import {
	createPurchaseOrderSchema,
	purchaseOrderIdParamsSchema,
	updatePurchaseOrderSchema,
} from "../schemas/purchase-order.schema";

export const purchaseOrdersRouter: import("express").Router = Router();

purchaseOrdersRouter.use(requireAuth);

purchaseOrdersRouter.get("/", asyncHandler(listPurchaseOrdersController));
purchaseOrdersRouter.post("/", validateBody(createPurchaseOrderSchema), asyncHandler(createPurchaseOrderController));
purchaseOrdersRouter.get(
	"/:purchaseOrderId",
	validateParams(purchaseOrderIdParamsSchema),
	asyncHandler(getPurchaseOrderController),
);
purchaseOrdersRouter.patch(
	"/:purchaseOrderId",
	validateParams(purchaseOrderIdParamsSchema),
	validateBody(updatePurchaseOrderSchema),
	asyncHandler(updatePurchaseOrderController),
);
purchaseOrdersRouter.delete(
	"/:purchaseOrderId",
	validateParams(purchaseOrderIdParamsSchema),
	asyncHandler(archivePurchaseOrderController),
);
