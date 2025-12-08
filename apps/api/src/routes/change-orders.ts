import { Router } from "express";
import {
  createChangeOrderController,
  decideChangeOrderController,
  getChangeOrderController,
  listChangeOrdersController,
  submitChangeOrderController,
  updateChangeOrderController,
} from "../controllers/change-order";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams, validateQuery } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import {
  changeOrderIdParamsSchema,
  createChangeOrderSchema,
  decisionChangeOrderSchema,
  listChangeOrdersQuerySchema,
  updateChangeOrderSchema,
} from "../schemas/change-order.schema";

export const changeOrdersRouter = Router();

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
  validateParams(changeOrderIdParamsSchema),
  validateBody(decisionChangeOrderSchema),
  asyncHandler(decideChangeOrderController),
);
