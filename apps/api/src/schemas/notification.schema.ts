import { z } from "zod";

export const notificationIdParamsSchema = z.object({
  notificationId: z.string().min(1),
});

export const createNotificationSchema = z.object({
  userId: z.string().min(1),
  type: z.string().min(2),
  title: z.string().min(2),
  body: z.string().min(2),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
