import { z } from "zod";

const observationCategorySchema = z.enum([
  "work_progress",
  "safety_issue",
  "material_present",
  "site_condition",
  "equipment",
]);

export const siteSnapIdParamsSchema = z.object({
  siteSnapId: z.string().min(1),
});

export const siteSnapObservationParamsSchema = z.object({
  siteSnapId: z.string().min(1),
  observationId: z.string().min(1),
});

export const listSiteSnapsQuerySchema = z.object({
  projectId: z.string().min(1),
});

const imageUrlsSchema = z.array(z.string().url()).min(1).max(10);
const imageFileAssetIdsSchema = z.array(z.string().min(1)).min(1).max(10);

export const createSiteSnapSchema = z
  .object({
    projectId: z.string().min(1),
    notes: z.string().min(2),
    locationZone: z.string().min(1),
    imageUrls: imageUrlsSchema.optional(),
    imageFileAssetIds: imageFileAssetIdsSchema.optional(),
  })
  .superRefine((value, context) => {
    if (!value.imageUrls?.length && !value.imageFileAssetIds?.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either imageUrls or imageFileAssetIds is required",
        path: ["imageUrls"],
      });
    }
  });

export const updateSiteSnapSchema = z
  .object({
    notes: z.string().min(2).optional(),
    locationZone: z.string().min(1).optional(),
    imageUrls: imageUrlsSchema.optional(),
    imageFileAssetIds: imageFileAssetIdsSchema.optional(),
  })
  .superRefine((value, context) => {
    if (
      value.notes === undefined &&
      value.locationZone === undefined &&
      value.imageUrls === undefined &&
      value.imageFileAssetIds === undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided",
      });
    }
  });

export const createObservationSchema = z.object({
  category: observationCategorySchema,
  confidenceBps: z.number().int().min(0).max(10000),
  detail: z.string().min(2),
  source: z.enum(["ai", "manual"]).default("manual"),
});

export const updateObservationSchema = z.object({
  category: observationCategorySchema.optional(),
  confidenceBps: z.number().int().min(0).max(10000).optional(),
  detail: z.string().min(2).optional(),
});

export const dailyProgressQuerySchema = z.object({
  projectId: z.string().min(1),
  day: z.string().optional(),
});
