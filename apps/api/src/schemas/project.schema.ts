import { z } from "zod";

export const projectIdParamsSchema = z.object({
  projectId: z.string().min(1),
});

export const createProjectSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).regex(/^[A-Z0-9-]+$/),
  description: z.string().max(2000).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).regex(/^[A-Z0-9-]+$/).optional(),
  description: z.string().max(2000).optional(),
});

export const projectRoleSchema = z.enum(["pm", "field_supervisor", "viewer"]);

export const projectMembersParamsSchema = z.object({
  projectId: z.string().min(1),
});

export const projectMemberParamsSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
});

export const createProjectMemberSchema = z.object({
  userId: z.string().min(1),
  role: projectRoleSchema,
  departmentIds: z.array(z.string().min(1)).max(50).default([]),
});

export const updateProjectMemberSchema = z
  .object({
    role: projectRoleSchema.optional(),
    departmentIds: z.array(z.string().min(1)).max(50).optional(),
  })
  .superRefine((value, context) => {
    if (value.role === undefined && value.departmentIds === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided",
      });
    }
  });
