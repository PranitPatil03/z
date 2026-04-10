import { z } from "zod";

export const roleScopeSchema = z.enum(["organization", "project"]);

const roleCodeSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9_-]*$/);

export const permissionKeySchema = z
  .string()
  .min(3)
  .max(120)
  .regex(/^[a-z0-9][a-z0-9_.-]*$/);

export const roleIdParamsSchema = z.object({
  roleId: z.string().min(1),
});

export const assignmentIdParamsSchema = z.object({
  assignmentId: z.string().min(1),
});

export const listRolesQuerySchema = z.object({
  scope: roleScopeSchema.optional(),
  includeSystem: z.coerce.boolean().optional().default(true),
});

export const createRoleSchema = z.object({
  code: roleCodeSchema,
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional(),
  scope: roleScopeSchema,
});

export const updateRoleSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    description: z.string().max(1000).optional(),
  })
  .superRefine((value, context) => {
    if (value.name === undefined && value.description === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided",
      });
    }
  });

export const setRolePermissionsSchema = z.object({
  permissionKeys: z.array(permissionKeySchema).max(400),
  replaceExisting: z.boolean().default(true),
});

export const listAssignmentsQuerySchema = z.object({
  userId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  roleId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const assignRoleSchema = z.object({
  roleId: z.string().min(1),
  userId: z.string().min(1),
  projectId: z.string().min(1).optional(),
  source: z.string().min(1).max(120).optional(),
});

export const resolvePermissionsQuerySchema = z.object({
  userId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
});

export const checkPermissionSchema = z.object({
  permissionKey: permissionKeySchema,
  userId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
});

export const bootstrapPermissionsSchema = z.object({
  syncSystemAssignments: z.boolean().optional().default(true),
});
