import { Router } from "express";
import {
  archiveReceiptController,
  createReceiptController,
  getReceiptController,
  listReceiptsController,
  updateReceiptController,
} from "../controllers/receipt";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import {
  createReceiptSchema,
  receiptIdParamsSchema,
  updateReceiptSchema,
} from "../schemas/receipt.schema";

export const receiptsRouter: import("express").Router = Router();

receiptsRouter.use(requireAuth);

receiptsRouter.get("/", asyncHandler(listReceiptsController));
receiptsRouter.post(
  "/",
  validateBody(createReceiptSchema),
  asyncHandler(createReceiptController),
);
receiptsRouter.get(
  "/:receiptId",
  validateParams(receiptIdParamsSchema),
  asyncHandler(getReceiptController),
);
receiptsRouter.patch(
  "/:receiptId",
  validateParams(receiptIdParamsSchema),
  validateBody(updateReceiptSchema),
  asyncHandler(updateReceiptController),
);
receiptsRouter.delete(
  "/:receiptId",
  validateParams(receiptIdParamsSchema),
  asyncHandler(archiveReceiptController),
);
