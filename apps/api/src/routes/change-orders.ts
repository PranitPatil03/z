import { Router } from "express";
import {
  attachChangeOrderFileAssetController,
  createChangeOrderController,
  detachChangeOrderFileAssetController,
  decideChangeOrderController,
  getChangeOrderController,
  listChangeOrderAttachmentsController,
  listChangeOrdersController,
  submitChangeOrderController,
  updateChangeOrderController,
} from "../controllers/change-order";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams, validateQuery } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import { requireOrgRole } from "../middleware/require-role";
import {
  changeOrderAttachmentParamsSchema,
  changeOrderIdParamsSchema,
  createChangeOrderSchema,
  decisionChangeOrderSchema,
  listChangeOrdersQuerySchema,
  updateChangeOrderSchema,
} from "../schemas/change-order.schema";

export const changeOrdersRouter: import("express").Router = Router();

changeOrdersRouter.use(requireAuth);

changeOrdersRouter.get("/", validateQuery(listChangeOrdersQuerySchema), asyncHandler(listChangeOrdersController));
changeOrdersRouter.post("/", validateBody(createChangeOrderSchema), asyncHandler(createChangeOrderController));
changeOrdersRouter.get("/:changeOrderId", validateParams(changeOrderIdParamsSchema), asyncHandler(getChangeOrderController));
changeOrdersRouter.patch(
  "/:changeOrderId",
  validateParams(changeOrderIdParamsSchema),
  validateBody(updateChangeOrderSchema),
  asyncHandler(updateChangeOrderController),
);
changeOrdersRouter.post(
  "/:changeOrderId/submit",
  validateParams(changeOrderIdParamsSchema),
  asyncHandler(submitChangeOrderController),
);
changeOrdersRouter.post(
  "/:changeOrderId/decision",
  requireOrgRole("owner", "admin"),
  validateParams(changeOrderIdParamsSchema),
  validateBody(decisionChangeOrderSchema),
  asyncHandler(decideChangeOrderController),
);

changeOrdersRouter.get(
  "/:changeOrderId/attachments",
  validateParams(changeOrderIdParamsSchema),
  asyncHandler(listChangeOrderAttachmentsController),
);

changeOrdersRouter.post(
  "/:changeOrderId/attachments/:fileAssetId",
  validateParams(changeOrderAttachmentParamsSchema),
  asyncHandler(attachChangeOrderFileAssetController),
);

changeOrdersRouter.delete(
  "/:changeOrderId/attachments/:fileAssetId",
  validateParams(changeOrderAttachmentParamsSchema),
  asyncHandler(detachChangeOrderFileAssetController),
);
