import type { ProjectMember } from "@/lib/api/modules/projects-api";
import { z } from "zod";

export const createProjectFormSchema = z.object({
  name: z.string().trim().min(2, "Project name is required"),
  code: z
    .string()
    .trim()
    .min(2, "Project code is required")
    .regex(/^[A-Z0-9-]+$/, "Use uppercase letters, numbers, and dashes"),
  description: z
    .string()
    .trim()
    .max(2000, "Description is too long")
    .optional(),
});

export const updateProjectFormSchema = createProjectFormSchema
  .partial()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.code !== undefined ||
      value.description !== undefined,
    {
      message: "At least one field is required",
    },
  );

export const projectMemberFormSchema = z.object({
  userId: z.string().trim().min(1, "User ID is required"),
  role: z.enum(["pm", "field_supervisor", "viewer"]),
  departmentIds: z.array(z.string().trim().min(1)).default([]),
});

export type CreateProjectFormValues = z.infer<typeof createProjectFormSchema>;
export type UpdateProjectFormValues = z.infer<typeof updateProjectFormSchema>;
export type ProjectMemberFormValues = z.infer<typeof projectMemberFormSchema>;

export function upsertProjectMember(
  members: ProjectMember[],
  member: ProjectMember,
): ProjectMember[] {
  const existingIndex = members.findIndex(
    (item) => item.userId === member.userId,
  );
  if (existingIndex === -1) {
    return [member, ...members];
  }

  return members.map((item, index) =>
    index === existingIndex ? member : item,
  );
}

export function removeProjectMemberByUserId(
  members: ProjectMember[],
  userId: string,
): ProjectMember[] {
  return members.filter((item) => item.userId !== userId);
}
