import { Router } from "express";
import {
  createNotificationController,
  deleteNotificationController,
  getNotificationPreferencesController,
  getUnreadNotificationCountController,
  listMyNotificationsController,
  markNotificationAsReadController,
  updateNotificationPreferencesController,
} from "../controllers/notification";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import {
  createNotificationSchema,
  notificationIdParamsSchema,
  updateNotificationPreferencesSchema,
} from "../schemas/notification.schema";

export const notificationsRouter: import("express").Router = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get("/", asyncHandler(listMyNotificationsController));
notificationsRouter.get(
  "/unread-count",
  asyncHandler(getUnreadNotificationCountController),
);
notificationsRouter.get(
  "/preferences",
  asyncHandler(getNotificationPreferencesController),
);
notificationsRouter.put(
  "/preferences",
  validateBody(updateNotificationPreferencesSchema),
  asyncHandler(updateNotificationPreferencesController),
);
notificationsRouter.post(
  "/",
  validateBody(createNotificationSchema),
  asyncHandler(createNotificationController),
);
notificationsRouter.patch(
  "/:notificationId/read",
  validateParams(notificationIdParamsSchema),
  asyncHandler(markNotificationAsReadController),
);
notificationsRouter.delete(
  "/:notificationId",
  validateParams(notificationIdParamsSchema),
  asyncHandler(deleteNotificationController),
);
