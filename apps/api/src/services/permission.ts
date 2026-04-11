import {
  accessRoleAssignments,
  accessRolePermissions,
  accessRoles,
  members,
  permissionCatalog,
  projectMembers,
  users,
} from "@foreman/db";
import { type SQL, and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import type { Request } from "express";
import { db } from "../database";
import { badRequest, forbidden, notFound, unauthorized } from "../lib/errors";
import {
  allPermissionKeys,
  builtInOrgRolePermissions,
  builtInProjectRolePermissions,
  normalizePermissionKeys,
  permissionDefinitions,
  permissionKeyExists,
  systemRoleTemplates,
} from "../lib/permissions";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  assignRoleSchema,
  assignmentIdParamsSchema,
  bootstrapPermissionsSchema,
  checkPermissionSchema,
  createRoleSchema,
  listAssignmentsQuerySchema,
  listRolesQuerySchema,
  resolvePermissionsQuerySchema,
  roleIdParamsSchema,
  setRolePermissionsSchema,
  updateRoleSchema,
} from "../schemas/permission.schema";

interface RequestContext {
  organizationId: string;
  userId: string;
}

interface MembershipRecord {
  role: string;
}

export interface EffectivePermissionResult {
  permissions: string[];
  sources: {
    organizationRole: string;
    projectRole: string | null;
    customRoleCodes: string[];
  };
}

function readValidatedBody<T>(request: Request) {
  const validatedBody = (request as ValidatedRequest).validated?.body;
  return (validatedBody ?? request.body) as T;
}

function readValidatedParams<T>(request: Request) {
  const validatedParams = (request as ValidatedRequest).validated?.params;
  return (validatedParams ?? request.params) as T;
}

function readValidatedQuery<T>(request: Request) {
  const validatedQuery = (request as ValidatedRequest).validated?.query;
  return (validatedQuery ?? request.query) as T;
}

function requireContext(request: Request): RequestContext {
  const { session, user } = getAuthContext(request);

  if (!session.activeOrganizationId) {
    throw badRequest("An active organization is required");
  }

  return {
    organizationId: session.activeOrganizationId,
    userId: user.id,
  };
}

function andConditions(conditions: SQL<unknown>[]) {
  if (conditions.length === 0) {
    throw badRequest("Invalid query conditions");
  }

  if (conditions.length === 1) {
    return conditions[0] as SQL<unknown>;
  }

  return and(...conditions) as SQL<unknown>;
}

async function loadMembership(
  organizationId: string,
  userId: string,
): Promise<MembershipRecord> {
  const [membership] = await db
    .select({ role: members.role })
    .from(members)
    .where(
      and(
        eq(members.organizationId, organizationId),
        eq(members.userId, userId),
      ),
    )
    .limit(1);

  if (!membership) {
    throw unauthorized("You are not a member of this organization");
  }

  return membership;
}

function isOrgAdmin(role: string) {
  return role === "owner" || role === "admin";
}

function assertCanInspectTargetUser(
  actorRole: string,
  actorUserId: string,
  targetUserId: string,
) {
  if (actorUserId === targetUserId) {
    return;
  }

  if (!isOrgAdmin(actorRole)) {
    throw forbidden("Only owner/admin can inspect another user's permissions");
  }
}

function assertCanManageAccess(actorRole: string) {
  if (!isOrgAdmin(actorRole)) {
    throw forbidden("Only owner/admin can manage custom roles and permissions");
  }
}

async function syncPermissionCatalog() {
  await db
    .insert(permissionCatalog)
    .values(
      permissionDefinitions.map((definition) => ({
        key: definition.key,
        module: definition.module,
        action: definition.action,
        description: definition.description,
      })),
    )
    .onConflictDoNothing({
      target: permissionCatalog.key,
    });
}

async function listValidPermissionKeys() {
  await syncPermissionCatalog();

  const rows = await db
    .select({ key: permissionCatalog.key })
    .from(permissionCatalog);

  return new Set(rows.map((row) => row.key));
}

async function loadRoleForOrganization(organizationId: string, roleId: string) {
  const [role] = await db
    .select()
    .from(accessRoles)
    .where(
      and(
        eq(accessRoles.organizationId, organizationId),
        eq(accessRoles.id, roleId),
      ),
    )
    .limit(1);

  if (!role) {
    throw notFound("Role not found");
  }

  return role;
}

async function upsertSystemRoles(input: {
  organizationId: string;
  actorUserId: string;
}) {
  const rolesByCode = new Map<
    string,
    { id: string; code: string; scope: string }
  >();

  for (const template of systemRoleTemplates) {
    const [role] = await db
      .insert(accessRoles)
      .values({
        organizationId: input.organizationId,
        code: template.code,
        name: template.name,
        description: template.description,
        scope: template.scope,
        isSystem: true,
        createdByUserId: input.actorUserId,
      })
      .onConflictDoUpdate({
        target: [
          accessRoles.organizationId,
          accessRoles.scope,
          accessRoles.code,
        ],
        set: {
          name: template.name,
          description: template.description,
          isSystem: true,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: accessRoles.id,
        code: accessRoles.code,
        scope: accessRoles.scope,
      });

    rolesByCode.set(template.code, role);
  }

  const systemRoleIds = Array.from(rolesByCode.values()).map((role) => role.id);

  if (systemRoleIds.length > 0) {
    await db
      .delete(accessRolePermissions)
      .where(inArray(accessRolePermissions.roleId, systemRoleIds));
  }

  const permissionRows = systemRoleTemplates.flatMap((template) => {
    const role = rolesByCode.get(template.code);
    if (!role) {
      return [];
    }

    return normalizePermissionKeys(template.permissions).map(
      (permissionKey) => ({
        organizationId: input.organizationId,
        roleId: role.id,
        permissionKey,
        granted: true,
      }),
    );
  });

  if (permissionRows.length > 0) {
    await db
      .insert(accessRolePermissions)
      .values(permissionRows)
      .onConflictDoNothing({
        target: [
          accessRolePermissions.roleId,
          accessRolePermissions.permissionKey,
        ],
      });
  }

  return rolesByCode;
}

async function syncSystemAssignments(input: {
  organizationId: string;
  actorUserId: string;
  rolesByCode: Map<string, { id: string; code: string; scope: string }>;
}) {
  const [orgMembers, projMembers] = await Promise.all([
    db
      .select({ userId: members.userId, role: members.role })
      .from(members)
      .where(eq(members.organizationId, input.organizationId)),
    db
      .select({
        userId: projectMembers.userId,
        projectId: projectMembers.projectId,
        role: projectMembers.role,
      })
      .from(projectMembers)
      .where(eq(projectMembers.organizationId, input.organizationId)),
  ]);

  const orgRoleCodeByMembership: Record<string, string> = {
    owner: "org_owner",
    admin: "org_admin",
    member: "org_member",
  };

  const projectRoleCodeByMembership: Record<string, string> = {
    pm: "project_pm",
    field_supervisor: "project_field_supervisor",
    viewer: "project_viewer",
  };

  await db
    .delete(accessRoleAssignments)
    .where(
      and(
        eq(accessRoleAssignments.organizationId, input.organizationId),
        eq(accessRoleAssignments.source, "system-sync"),
      ),
    );

  const rows = [] as Array<{
    organizationId: string;
    projectId: string | null;
    userId: string;
    roleId: string;
    assignedByUserId: string;
    source: string;
  }>;

  for (const member of orgMembers) {
    const roleCode = orgRoleCodeByMembership[member.role];
    const role = roleCode ? input.rolesByCode.get(roleCode) : undefined;

    if (!role) {
      continue;
    }

    rows.push({
      organizationId: input.organizationId,
      projectId: null,
      userId: member.userId,
      roleId: role.id,
      assignedByUserId: input.actorUserId,
      source: "system-sync",
    });
  }

  for (const member of projMembers) {
    const roleCode = projectRoleCodeByMembership[member.role];
    const role = roleCode ? input.rolesByCode.get(roleCode) : undefined;

    if (!role) {
      continue;
    }

    rows.push({
      organizationId: input.organizationId,
      projectId: member.projectId,
      userId: member.userId,
      roleId: role.id,
      assignedByUserId: input.actorUserId,
      source: "system-sync",
    });
  }

  if (rows.length > 0) {
    await db.insert(accessRoleAssignments).values(rows);
  }

  return rows.length;
}

export async function resolveEffectivePermissions(input: {
  organizationId: string;
  userId: string;
  projectId?: string;
}): Promise<EffectivePermissionResult> {
  const membership = await loadMembership(input.organizationId, input.userId);
  const permissionSet = new Set<string>(
    builtInOrgRolePermissions[membership.role] ?? [],
  );

  let projectRole: string | null = null;

  if (input.projectId) {
    const [projectMembership] = await db
      .select({ role: projectMembers.role })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.organizationId, input.organizationId),
          eq(projectMembers.projectId, input.projectId),
          eq(projectMembers.userId, input.userId),
        ),
      )
      .limit(1);

    if (projectMembership) {
      projectRole = projectMembership.role;
      for (const permissionKey of builtInProjectRolePermissions[
        projectMembership.role
      ] ?? []) {
        permissionSet.add(permissionKey);
      }
    }
  }

  const assignmentConditions: SQL<unknown>[] = [
    eq(accessRoleAssignments.organizationId, input.organizationId),
    eq(accessRoleAssignments.userId, input.userId),
  ];

  if (input.projectId) {
    assignmentConditions.push(
      or(
        isNull(accessRoleAssignments.projectId),
        eq(accessRoleAssignments.projectId, input.projectId),
      ) as SQL<unknown>,
    );
  } else {
    assignmentConditions.push(isNull(accessRoleAssignments.projectId));
  }

  const customPermissionRows = await db
    .select({
      roleCode: accessRoles.code,
      permissionKey: accessRolePermissions.permissionKey,
      granted: accessRolePermissions.granted,
    })
    .from(accessRoleAssignments)
    .innerJoin(
      accessRoles,
      and(
        eq(accessRoles.id, accessRoleAssignments.roleId),
        eq(accessRoles.organizationId, accessRoleAssignments.organizationId),
      ),
    )
    .leftJoin(
      accessRolePermissions,
      eq(accessRolePermissions.roleId, accessRoles.id),
    )
    .where(andConditions(assignmentConditions));

  const customRoleCodes = new Set<string>();

  for (const row of customPermissionRows) {
    customRoleCodes.add(row.roleCode);

    if (row.permissionKey && row.granted) {
      permissionSet.add(row.permissionKey);
    }
  }

  if (membership.role === "owner") {
    for (const permissionKey of allPermissionKeys) {
      permissionSet.add(permissionKey);
    }
  }

  return {
    permissions: Array.from(permissionSet).sort(),
    sources: {
      organizationRole: membership.role,
      projectRole,
      customRoleCodes: Array.from(customRoleCodes).sort(),
    },
  };
}

export async function hasPermission(input: {
  organizationId: string;
  userId: string;
  permissionKey: string;
  projectId?: string;
}) {
  const effective = await resolveEffectivePermissions({
    organizationId: input.organizationId,
    userId: input.userId,
    projectId: input.projectId,
  });

  if (effective.sources.organizationRole === "owner") {
    return true;
  }

  return effective.permissions.includes(input.permissionKey);
}

export const permissionService = {
  async listCatalog() {
    await syncPermissionCatalog();

    return await db
      .select()
      .from(permissionCatalog)
      .orderBy(asc(permissionCatalog.module), asc(permissionCatalog.action));
  },

  async bootstrapPermissions(request: Request) {
    const context = requireContext(request);
    const body = bootstrapPermissionsSchema.parse(readValidatedBody(request));
    const actorMembership = await loadMembership(
      context.organizationId,
      context.userId,
    );
    assertCanManageAccess(actorMembership.role);

    await syncPermissionCatalog();
    const rolesByCode = await upsertSystemRoles({
      organizationId: context.organizationId,
      actorUserId: context.userId,
    });

    let assignmentCount = 0;
    if (body.syncSystemAssignments) {
      assignmentCount = await syncSystemAssignments({
        organizationId: context.organizationId,
        actorUserId: context.userId,
        rolesByCode,
      });
    }

    return {
      syncedCatalogEntries: permissionDefinitions.length,
      syncedRoles: rolesByCode.size,
      syncedAssignments: assignmentCount,
    };
  },

  async listRoles(request: Request) {
    const context = requireContext(request);
    const query = listRolesQuerySchema.parse(readValidatedQuery(request) ?? {});

    await loadMembership(context.organizationId, context.userId);

    const conditions: SQL<unknown>[] = [
      eq(accessRoles.organizationId, context.organizationId),
    ];

    if (query.scope) {
      conditions.push(eq(accessRoles.scope, query.scope));
    }

    if (!query.includeSystem) {
      conditions.push(eq(accessRoles.isSystem, false));
    }

    const roles = await db
      .select()
      .from(accessRoles)
      .where(andConditions(conditions))
      .orderBy(asc(accessRoles.scope), asc(accessRoles.name));

    if (roles.length === 0) {
      return [];
    }

    const roleIds = roles.map((role) => role.id);

    const [permissionRows, assignmentRows] = await Promise.all([
      db
        .select({
          roleId: accessRolePermissions.roleId,
          permissionKey: accessRolePermissions.permissionKey,
        })
        .from(accessRolePermissions)
        .where(inArray(accessRolePermissions.roleId, roleIds)),
      db
        .select({
          roleId: accessRoleAssignments.roleId,
          id: accessRoleAssignments.id,
        })
        .from(accessRoleAssignments)
        .where(inArray(accessRoleAssignments.roleId, roleIds)),
    ]);

    const permissionMap = new Map<string, string[]>();
    for (const row of permissionRows) {
      const current = permissionMap.get(row.roleId) ?? [];
      current.push(row.permissionKey);
      permissionMap.set(row.roleId, current);
    }

    const assignmentCountMap = new Map<string, number>();
    for (const row of assignmentRows) {
      assignmentCountMap.set(
        row.roleId,
        (assignmentCountMap.get(row.roleId) ?? 0) + 1,
      );
    }

    return roles.map((role) => ({
      ...role,
      permissionKeys: normalizePermissionKeys(permissionMap.get(role.id) ?? []),
      assignmentCount: assignmentCountMap.get(role.id) ?? 0,
    }));
  },

  async getRole(request: Request) {
    const context = requireContext(request);
    const params = roleIdParamsSchema.parse(readValidatedParams(request));

    await loadMembership(context.organizationId, context.userId);

    const role = await loadRoleForOrganization(
      context.organizationId,
      params.roleId,
    );

    const [permissions, assignments] = await Promise.all([
      db
        .select({ permissionKey: accessRolePermissions.permissionKey })
        .from(accessRolePermissions)
        .where(eq(accessRolePermissions.roleId, role.id)),
      db
        .select({ id: accessRoleAssignments.id })
        .from(accessRoleAssignments)
        .where(eq(accessRoleAssignments.roleId, role.id)),
    ]);

    return {
      ...role,
      permissionKeys: normalizePermissionKeys(
        permissions.map((item) => item.permissionKey),
      ),
      assignmentCount: assignments.length,
    };
  },

  async createRole(request: Request) {
    const context = requireContext(request);
    const actorMembership = await loadMembership(
      context.organizationId,
      context.userId,
    );
    assertCanManageAccess(actorMembership.role);

    const body = createRoleSchema.parse(readValidatedBody(request));

    if (systemRoleTemplates.some((template) => template.code === body.code)) {
      throw badRequest("This role code is reserved for system roles");
    }

    const [role] = await db
      .insert(accessRoles)
      .values({
        organizationId: context.organizationId,
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        scope: body.scope,
        isSystem: false,
        createdByUserId: context.userId,
      })
      .returning();

    return {
      ...role,
      permissionKeys: [],
      assignmentCount: 0,
    };
  },

  async updateRole(request: Request) {
    const context = requireContext(request);
    const actorMembership = await loadMembership(
      context.organizationId,
      context.userId,
    );
    assertCanManageAccess(actorMembership.role);

    const params = roleIdParamsSchema.parse(readValidatedParams(request));
    const body = updateRoleSchema.parse(readValidatedBody(request));
    const role = await loadRoleForOrganization(
      context.organizationId,
      params.roleId,
    );

    if (role.isSystem) {
      throw forbidden("System roles cannot be edited");
    }

    const [updated] = await db
      .update(accessRoles)
      .set({
        name: body.name ?? role.name,
        description: body.description ?? role.description,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(accessRoles.organizationId, context.organizationId),
          eq(accessRoles.id, role.id),
        ),
      )
      .returning();

    if (!updated) {
      throw notFound("Role not found");
    }

    return updated;
  },

  async deleteRole(request: Request) {
    const context = requireContext(request);
    const actorMembership = await loadMembership(
      context.organizationId,
      context.userId,
    );
    assertCanManageAccess(actorMembership.role);

    const params = roleIdParamsSchema.parse(readValidatedParams(request));
    const role = await loadRoleForOrganization(
      context.organizationId,
      params.roleId,
    );

    if (role.isSystem) {
      throw forbidden("System roles cannot be deleted");
    }

    const [deleted] = await db
      .delete(accessRoles)
      .where(
        and(
          eq(accessRoles.organizationId, context.organizationId),
          eq(accessRoles.id, role.id),
        ),
      )
      .returning();

    if (!deleted) {
      throw notFound("Role not found");
    }

    return deleted;
  },

  async listRolePermissions(request: Request) {
    const context = requireContext(request);
    const params = roleIdParamsSchema.parse(readValidatedParams(request));

    await loadMembership(context.organizationId, context.userId);

    const role = await loadRoleForOrganization(
      context.organizationId,
      params.roleId,
    );

    const rows = await db
      .select({ permissionKey: accessRolePermissions.permissionKey })
      .from(accessRolePermissions)
      .where(eq(accessRolePermissions.roleId, role.id));

    return {
      role,
      permissionKeys: normalizePermissionKeys(
        rows.map((row) => row.permissionKey),
      ),
    };
  },

  async setRolePermissions(request: Request) {
    const context = requireContext(request);
    const actorMembership = await loadMembership(
      context.organizationId,
      context.userId,
    );
    assertCanManageAccess(actorMembership.role);

    const params = roleIdParamsSchema.parse(readValidatedParams(request));
    const body = setRolePermissionsSchema.parse(readValidatedBody(request));
    const role = await loadRoleForOrganization(
      context.organizationId,
      params.roleId,
    );

    if (role.isSystem) {
      throw forbidden(
        "System role permissions are managed by bootstrap and cannot be edited directly",
      );
    }

    const permissionKeys = normalizePermissionKeys(body.permissionKeys);
    const validPermissionKeys = await listValidPermissionKeys();

    const invalidPermissionKeys = permissionKeys.filter(
      (permissionKey) =>
        !validPermissionKeys.has(permissionKey) &&
        !permissionKeyExists(permissionKey),
    );
    if (invalidPermissionKeys.length > 0) {
      throw badRequest("One or more permission keys are invalid", {
        invalidPermissionKeys,
      });
    }

    if (body.replaceExisting) {
      await db
        .delete(accessRolePermissions)
        .where(eq(accessRolePermissions.roleId, role.id));
    }

    if (permissionKeys.length > 0) {
      await db
        .insert(accessRolePermissions)
        .values(
          permissionKeys.map((permissionKey) => ({
            organizationId: context.organizationId,
            roleId: role.id,
            permissionKey,
            granted: true,
          })),
        )
        .onConflictDoUpdate({
          target: [
            accessRolePermissions.roleId,
            accessRolePermissions.permissionKey,
          ],
          set: {
            granted: true,
          },
        });
    }

    const rows = await db
      .select({ permissionKey: accessRolePermissions.permissionKey })
      .from(accessRolePermissions)
      .where(eq(accessRolePermissions.roleId, role.id));

    return {
      role,
      permissionKeys: normalizePermissionKeys(
        rows.map((row) => row.permissionKey),
      ),
    };
  },

  async listAssignments(request: Request) {
    const context = requireContext(request);
    const query = listAssignmentsQuerySchema.parse(
      readValidatedQuery(request) ?? {},
    );

    await loadMembership(context.organizationId, context.userId);

    const conditions: SQL<unknown>[] = [
      eq(accessRoleAssignments.organizationId, context.organizationId),
    ];

    if (query.userId) {
      conditions.push(eq(accessRoleAssignments.userId, query.userId));
    }

    if (query.roleId) {
      conditions.push(eq(accessRoleAssignments.roleId, query.roleId));
    }

    if (query.projectId) {
      conditions.push(eq(accessRoleAssignments.projectId, query.projectId));
    }

    const rows = await db
      .select({
        id: accessRoleAssignments.id,
        organizationId: accessRoleAssignments.organizationId,
        projectId: accessRoleAssignments.projectId,
        userId: accessRoleAssignments.userId,
        assignedByUserId: accessRoleAssignments.assignedByUserId,
        source: accessRoleAssignments.source,
        createdAt: accessRoleAssignments.createdAt,
        updatedAt: accessRoleAssignments.updatedAt,
        roleId: accessRoles.id,
        roleCode: accessRoles.code,
        roleName: accessRoles.name,
        roleScope: accessRoles.scope,
        userName: users.name,
        userEmail: users.email,
      })
      .from(accessRoleAssignments)
      .innerJoin(accessRoles, eq(accessRoleAssignments.roleId, accessRoles.id))
      .innerJoin(users, eq(accessRoleAssignments.userId, users.id))
      .where(andConditions(conditions))
      .orderBy(asc(accessRoleAssignments.createdAt))
      .limit(query.limit);

    return rows;
  },

  async assignRole(request: Request) {
    const context = requireContext(request);
    const actorMembership = await loadMembership(
      context.organizationId,
      context.userId,
    );
    assertCanManageAccess(actorMembership.role);

    const body = assignRoleSchema.parse(readValidatedBody(request));
    const role = await loadRoleForOrganization(
      context.organizationId,
      body.roleId,
    );

    if (role.scope === "project" && !body.projectId) {
      throw badRequest(
        "projectId is required when assigning a project-scoped role",
      );
    }

    if (role.scope === "organization" && body.projectId) {
      throw badRequest(
        "projectId is not allowed when assigning an organization-scoped role",
      );
    }

    const [assigneeMembership] = await db
      .select({ id: members.id })
      .from(members)
      .where(
        and(
          eq(members.organizationId, context.organizationId),
          eq(members.userId, body.userId),
        ),
      )
      .limit(1);

    if (!assigneeMembership) {
      throw badRequest(
        "Assigned user is not a member of the active organization",
      );
    }

    if (body.projectId) {
      const [projectMembership] = await db
        .select({ id: projectMembers.id })
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.organizationId, context.organizationId),
            eq(projectMembers.projectId, body.projectId),
            eq(projectMembers.userId, body.userId),
          ),
        )
        .limit(1);

      if (!projectMembership) {
        throw badRequest(
          "Assigned user is not a member of the specified project",
        );
      }
    }

    const uniquenessConditions: SQL<unknown>[] = [
      eq(accessRoleAssignments.organizationId, context.organizationId),
      eq(accessRoleAssignments.userId, body.userId),
      eq(accessRoleAssignments.roleId, role.id),
    ];

    if (body.projectId) {
      uniquenessConditions.push(
        eq(accessRoleAssignments.projectId, body.projectId),
      );
    } else {
      uniquenessConditions.push(isNull(accessRoleAssignments.projectId));
    }

    const [existingAssignment] = await db
      .select({ id: accessRoleAssignments.id })
      .from(accessRoleAssignments)
      .where(andConditions(uniquenessConditions))
      .limit(1);

    if (existingAssignment) {
      const [existing] = await db
        .select()
        .from(accessRoleAssignments)
        .where(eq(accessRoleAssignments.id, existingAssignment.id))
        .limit(1);

      return existing;
    }

    const [assignment] = await db
      .insert(accessRoleAssignments)
      .values({
        organizationId: context.organizationId,
        projectId: body.projectId ?? null,
        userId: body.userId,
        roleId: role.id,
        assignedByUserId: context.userId,
        source: body.source ?? "manual",
      })
      .returning();

    return assignment;
  },

  async removeAssignment(request: Request) {
    const context = requireContext(request);
    const actorMembership = await loadMembership(
      context.organizationId,
      context.userId,
    );
    assertCanManageAccess(actorMembership.role);

    const params = assignmentIdParamsSchema.parse(readValidatedParams(request));

    const [deleted] = await db
      .delete(accessRoleAssignments)
      .where(
        and(
          eq(accessRoleAssignments.organizationId, context.organizationId),
          eq(accessRoleAssignments.id, params.assignmentId),
        ),
      )
      .returning();

    if (!deleted) {
      throw notFound("Assignment not found");
    }

    return deleted;
  },

  async resolvePermissions(request: Request) {
    const context = requireContext(request);
    const query = resolvePermissionsQuerySchema.parse(
      readValidatedQuery(request) ?? {},
    );

    const actorMembership = await loadMembership(
      context.organizationId,
      context.userId,
    );
    const targetUserId = query.userId ?? context.userId;

    assertCanInspectTargetUser(
      actorMembership.role,
      context.userId,
      targetUserId,
    );

    const effective = await resolveEffectivePermissions({
      organizationId: context.organizationId,
      userId: targetUserId,
      projectId: query.projectId,
    });

    return {
      userId: targetUserId,
      projectId: query.projectId ?? null,
      ...effective,
    };
  },

  async checkPermission(request: Request) {
    const context = requireContext(request);
    const body = checkPermissionSchema.parse(readValidatedBody(request));

    const actorMembership = await loadMembership(
      context.organizationId,
      context.userId,
    );
    const targetUserId = body.userId ?? context.userId;

    assertCanInspectTargetUser(
      actorMembership.role,
      context.userId,
      targetUserId,
    );

    const effective = await resolveEffectivePermissions({
      organizationId: context.organizationId,
      userId: targetUserId,
      projectId: body.projectId,
    });

    const allowed =
      effective.sources.organizationRole === "owner" ||
      effective.permissions.includes(body.permissionKey);

    return {
      userId: targetUserId,
      permissionKey: body.permissionKey,
      projectId: body.projectId ?? null,
      allowed,
      effectivePermissions: effective.permissions,
      sources: effective.sources,
    };
  },
};
