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

const notificationChannelPreferenceSchema = z.object({
  inApp: z.boolean().default(true),
  email: z.boolean().default(true),
});

export const updateNotificationPreferencesSchema = z
  .object({
    defaults: notificationChannelPreferenceSchema.optional(),
    events: z
      .record(z.string(), notificationChannelPreferenceSchema)
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.defaults === undefined && value.events === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided",
      });
    }
  });
