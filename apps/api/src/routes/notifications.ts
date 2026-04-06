import { Router } from "express";
import {
	createNotificationController,
	deleteNotificationController,
	listMyNotificationsController,
	markNotificationAsReadController,
} from "../controllers/notification";
import { asyncHandler } from "../lib/async-handler";
import { validateBody, validateParams } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import { createNotificationSchema, notificationIdParamsSchema } from "../schemas/notification.schema";

export const notificationsRouter: import("express").Router = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get("/", asyncHandler(listMyNotificationsController));
notificationsRouter.post("/", validateBody(createNotificationSchema), asyncHandler(createNotificationController));
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
