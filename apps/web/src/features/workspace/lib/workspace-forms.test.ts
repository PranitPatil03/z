import { describe, expect, it } from "vitest";
import {
  createProjectFormSchema,
  projectMemberFormSchema,
  removeProjectMemberByUserId,
  updateProjectFormSchema,
  upsertProjectMember,
} from "./workspace-forms";

describe("workspace forms", () => {
  it("validates project create payload", () => {
    const parsed = createProjectFormSchema.safeParse({
      name: "Harbor Bridge Renovation",
      code: "HBR-001",
      description: "Main deck restoration",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid project code", () => {
    const parsed = createProjectFormSchema.safeParse({
      name: "Harbor Bridge Renovation",
      code: "hbr-001",
    });

    expect(parsed.success).toBe(false);
  });

  it("requires at least one field for project update", () => {
    const parsed = updateProjectFormSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it("validates project member payload", () => {
    const parsed = projectMemberFormSchema.safeParse({
      userId: "user-123",
      role: "pm",
      departmentIds: ["dept-1"],
    });

    expect(parsed.success).toBe(true);
  });

  it("upserts members by user id", () => {
    const member = {
      id: "pm-1",
      organizationId: "org-1",
      projectId: "proj-1",
      userId: "user-1",
      role: "viewer" as const,
      departmentIds: [],
      createdAt: "2026-04-10T00:00:00.000Z",
      updatedAt: "2026-04-10T00:00:00.000Z",
      user: {
        id: "user-1",
        name: "A User",
        email: "a@company.com",
      },
    };

    const created = upsertProjectMember([], member);
    expect(created).toHaveLength(1);

    const updated = upsertProjectMember(created, {
      ...member,
      role: "pm",
    });
    expect(updated).toHaveLength(1);
    expect(updated[0]?.role).toBe("pm");
  });

  it("removes members by user id", () => {
    const members = [
      {
        id: "pm-1",
        organizationId: "org-1",
        projectId: "proj-1",
        userId: "user-1",
        role: "viewer" as const,
        departmentIds: [],
        createdAt: "2026-04-10T00:00:00.000Z",
        updatedAt: "2026-04-10T00:00:00.000Z",
        user: {
          id: "user-1",
          name: "A User",
          email: "a@company.com",
        },
      },
      {
        id: "pm-2",
        organizationId: "org-1",
        projectId: "proj-1",
        userId: "user-2",
        role: "pm" as const,
        departmentIds: [],
        createdAt: "2026-04-10T00:00:00.000Z",
        updatedAt: "2026-04-10T00:00:00.000Z",
        user: {
          id: "user-2",
          name: "B User",
          email: "b@company.com",
        },
      },
    ];

    const next = removeProjectMemberByUserId(members, "user-1");
    expect(next).toHaveLength(1);
    expect(next[0]?.userId).toBe("user-2");
  });
});
