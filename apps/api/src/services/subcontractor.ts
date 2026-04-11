import {
  complianceItems,
  projects,
  subcontractorInvitations,
  subcontractors,
} from "@foreman/db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Request } from "express";
import { env } from "../config/env";
import { db } from "../database";
import { badRequest, notFound } from "../lib/errors";
import { enqueueNotificationDelivery } from "../lib/queues";
import type { ValidatedRequest } from "../lib/validate";
import { getAuthContext } from "../middleware/require-auth";
import {
  createSubcontractorSchema,
  inviteSubcontractorPortalSchema,
  listSubcontractorsQuerySchema,
  subcontractorIdParamsSchema,
  updateSubcontractorSchema,
} from "../schemas/subcontractor.schema";
import {
  applyComplianceTemplatesForSubcontractor,
  hashToken,
  issueOneTimeToken,
} from "./subconnect-utils";

function readValidatedBody<T>(request: Request) {
  return (request as ValidatedRequest).validated?.body as T;
}

function readValidatedParams<T>(request: Request) {
  return (request as ValidatedRequest).validated?.params as T;
}

function readValidatedQuery<T>(request: Request) {
  return (request as ValidatedRequest).validated?.query as T;
}

function requireContext(request: Request) {
  const { session, user } = getAuthContext(request);
  if (!session.activeOrganizationId) {
    throw badRequest("An active organization is required");
  }
  return { orgId: session.activeOrganizationId, userId: user.id };
}

export const subcontractorService = {
  async list(request: Request) {
    const { orgId } = requireContext(request);
    const query = listSubcontractorsQuerySchema.parse(
      readValidatedQuery(request),
    );

    const filters = [
      eq(subcontractors.organizationId, orgId),
      isNull(subcontractors.deletedAt),
    ];

    if (query.projectId) {
      filters.push(eq(subcontractors.projectId, query.projectId));
    }

    if (query.status) {
      filters.push(eq(subcontractors.status, query.status));
    }

    if (query.trade) {
      filters.push(eq(subcontractors.trade, query.trade));
    }

    if (typeof query.portalEnabled === "boolean") {
      filters.push(eq(subcontractors.portalEnabled, query.portalEnabled));
    }

    const rows = await db
      .select()
      .from(subcontractors)
      .where(and(...filters));

    if (!query.includeComplianceSummary || rows.length === 0) {
      return rows;
    }

    const subcontractorIds = rows.map((row) => row.id);
    const relatedCompliance = await db
      .select({
        subcontractorId: complianceItems.subcontractorId,
        status: complianceItems.status,
        dueDate: complianceItems.dueDate,
      })
      .from(complianceItems)
      .where(
        and(
          eq(complianceItems.organizationId, orgId),
          isNull(complianceItems.deletedAt),
          inArray(complianceItems.subcontractorId, subcontractorIds),
        ),
      );

    const now = Date.now();
    const dueSoonCutoff = now + 14 * 24 * 60 * 60 * 1000;
    const summaryBySubcontractor = relatedCompliance.reduce<
      Record<
        string,
        {
          total: number;
          pending: number;
          verified: number;
          expiring: number;
          compliant: number;
          nonCompliant: number;
          expired: number;
          dueSoon: number;
          overdue: number;
        }
      >
    >((acc, row) => {
      if (!row.subcontractorId) {
        return acc;
      }

      if (!acc[row.subcontractorId]) {
        acc[row.subcontractorId] = {
          total: 0,
          pending: 0,
          verified: 0,
          expiring: 0,
          compliant: 0,
          nonCompliant: 0,
          expired: 0,
          dueSoon: 0,
          overdue: 0,
        };
      }

      const bucket = acc[row.subcontractorId];
      bucket.total += 1;

      if (row.status === "pending") {
        bucket.pending += 1;
      }
      if (row.status === "verified") {
        bucket.verified += 1;
      }
      if (row.status === "expiring") {
        bucket.expiring += 1;
      }
      if (row.status === "compliant") {
        bucket.compliant += 1;
      }
      if (row.status === "non_compliant") {
        bucket.nonCompliant += 1;
      }
      if (row.status === "expired") {
        bucket.expired += 1;
      }

      const dueAt = row.dueDate?.getTime();
      if (typeof dueAt === "number") {
        if (
          dueAt < now &&
          row.status !== "verified" &&
          row.status !== "compliant"
        ) {
          bucket.overdue += 1;
        }
        if (
          dueAt >= now &&
          dueAt <= dueSoonCutoff &&
          row.status !== "verified" &&
          row.status !== "compliant"
        ) {
          bucket.dueSoon += 1;
        }
      }

      return acc;
    }, {});

    return rows.map((row) => ({
      ...row,
      complianceSummary: summaryBySubcontractor[row.id] ?? {
        total: 0,
        pending: 0,
        verified: 0,
        expiring: 0,
        compliant: 0,
        nonCompliant: 0,
        expired: 0,
        dueSoon: 0,
        overdue: 0,
      },
    }));
  },

  async create(request: Request) {
    const { orgId } = requireContext(request);
    const body = createSubcontractorSchema.parse(readValidatedBody(request));

    const [record] = await db
      .insert(subcontractors)
      .values({
        organizationId: orgId,
        projectId: body.projectId ?? null,
        name: body.name,
        email: body.email ?? null,
        phone: body.phone ?? null,
        trade: body.trade,
        status: "active",
        metadata: body.metadata ?? null,
      })
      .returning();

    if (record.projectId) {
      await applyComplianceTemplatesForSubcontractor({
        organizationId: orgId,
        projectId: record.projectId,
        subcontractorId: record.id,
      });
    }

    return record;
  },

  async get(request: Request) {
    const { orgId } = requireContext(request);
    const params = subcontractorIdParamsSchema.parse(
      readValidatedParams(request),
    );

    const [record] = await db
      .select()
      .from(subcontractors)
      .where(
        and(
          eq(subcontractors.id, params.subcontractorId),
          eq(subcontractors.organizationId, orgId),
          isNull(subcontractors.deletedAt),
        ),
      );

    if (!record) {
      throw notFound("Subcontractor not found");
    }

    return record;
  },

  async update(request: Request) {
    const { orgId } = requireContext(request);
    const params = subcontractorIdParamsSchema.parse(
      readValidatedParams(request),
    );
    const body = updateSubcontractorSchema.parse(readValidatedBody(request));

    const [record] = await db
      .update(subcontractors)
      .set({ ...body, updatedAt: new Date() })
      .where(
        and(
          eq(subcontractors.id, params.subcontractorId),
          eq(subcontractors.organizationId, orgId),
          isNull(subcontractors.deletedAt),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("Subcontractor not found");
    }

    return record;
  },

  async archive(request: Request) {
    const { orgId } = requireContext(request);
    const params = subcontractorIdParamsSchema.parse(
      readValidatedParams(request),
    );

    const [record] = await db
      .update(subcontractors)
      .set({ status: "inactive", deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(subcontractors.id, params.subcontractorId),
          eq(subcontractors.organizationId, orgId),
          isNull(subcontractors.deletedAt),
        ),
      )
      .returning();

    if (!record) {
      throw notFound("Subcontractor not found");
    }

    return record;
  },

  async invitePortalAccess(request: Request) {
    const { orgId, userId } = requireContext(request);
    const params = subcontractorIdParamsSchema.parse(
      readValidatedParams(request),
    );
    const body = inviteSubcontractorPortalSchema.parse(
      readValidatedBody(request),
    );

    const [existing] = await db
      .select()
      .from(subcontractors)
      .where(
        and(
          eq(subcontractors.id, params.subcontractorId),
          eq(subcontractors.organizationId, orgId),
          isNull(subcontractors.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      throw notFound("Subcontractor not found");
    }

    if (existing.status !== "active") {
      throw badRequest(
        "Portal access can only be enabled for active subcontractors",
      );
    }

    const inviteEmail = body.email ?? existing.email;
    if (!inviteEmail) {
      throw badRequest(
        "Subcontractor email is required to enable portal access",
      );
    }

    const projectId = body.projectId ?? existing.projectId ?? null;
    if (!projectId) {
      throw badRequest(
        "Subcontractor must be assigned to a project before enabling portal access",
      );
    }

    const metadata = (existing.metadata ?? {}) as Record<string, unknown>;
    const assignment =
      metadata.portalAssignment &&
      typeof metadata.portalAssignment === "object" &&
      !Array.isArray(metadata.portalAssignment)
        ? (metadata.portalAssignment as Record<string, unknown>)
        : {};

    const nextMetadata = {
      ...metadata,
      portalAssignment: {
        ...assignment,
        assignedScope:
          body.assignedScope === undefined
            ? ((assignment.assignedScope as string | null | undefined) ?? null)
            : body.assignedScope,
        milestones:
          body.milestones ??
          (assignment.milestones as string[] | undefined) ??
          [],
        invitedAt: new Date().toISOString(),
        invitedByUserId: userId,
      },
    };

    const [project] = await db
      .select({ id: projects.id, name: projects.name, code: projects.code })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.organizationId, orgId),
          isNull(projects.deletedAt),
        ),
      )
      .limit(1);

    if (!project) {
      throw badRequest("Assigned project was not found");
    }

    const [updated] = await db
      .update(subcontractors)
      .set({
        email: inviteEmail,
        projectId,
        portalEnabled: false,
        passwordHash: null,
        metadata: nextMetadata,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subcontractors.id, params.subcontractorId),
          eq(subcontractors.organizationId, orgId),
          isNull(subcontractors.deletedAt),
        ),
      )
      .returning();

    if (!updated) {
      throw notFound("Subcontractor not found");
    }

    await db
      .update(subcontractorInvitations)
      .set({
        status: "revoked",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subcontractorInvitations.organizationId, orgId),
          eq(subcontractorInvitations.subcontractorId, updated.id),
          eq(subcontractorInvitations.status, "pending"),
        ),
      );

    const inviteToken = issueOneTimeToken();
    const tokenHash = hashToken(inviteToken);
    const inviteExpiryHours = env.SUBCONNECT_INVITATION_EXPIRY_HOURS ?? 7 * 24;
    const expiresAt = new Date(Date.now() + inviteExpiryHours * 60 * 60 * 1000);

    const [invitation] = await db
      .insert(subcontractorInvitations)
      .values({
        organizationId: orgId,
        projectId,
        subcontractorId: updated.id,
        invitedByUserId: userId,
        email: inviteEmail,
        tokenHash,
        status: "pending",
        assignedScope: body.assignedScope ?? null,
        milestones: body.milestones ?? [],
        metadata: {
          source: "internal_invite",
        },
        invitedAt: new Date(),
        expiresAt,
      })
      .returning();

    await applyComplianceTemplatesForSubcontractor({
      organizationId: orgId,
      projectId,
      subcontractorId: updated.id,
    });

    const inviteAcceptUrl = `${env.BETTER_AUTH_URL}/portal/accept-invitation?token=${inviteToken}`;

    let inviteEmailJobId: string | number | null = null;
    if (body.sendInviteEmail !== false) {
      inviteEmailJobId = await enqueueNotificationDelivery({
        toEmail: inviteEmail,
        subject: "Foreman SubConnect Portal Access",
        body:
          `You have been invited to Foreman SubConnect for project ${project.name} (${project.code}). ` +
          `Use this secure invitation link to activate your portal account: ${inviteAcceptUrl}. ` +
          `If prompted for token, use: ${inviteToken}. This invite expires on ${expiresAt.toISOString()}.`,
      });
    }

    return {
      subcontractor: {
        ...updated,
        passwordHash: null,
      },
      project,
      invitation,
      inviteToken,
      inviteAcceptUrl,
      inviteEmailQueued: inviteEmailJobId !== null,
      inviteEmailJobId,
    };
  },
};
