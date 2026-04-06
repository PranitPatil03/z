import { and, asc, desc, eq, gte, isNull } from "drizzle-orm";
import * as bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  complianceItems,
  dailyLogStatusEvents,
  dailyLogs,
  payApplicationLineItems,
  payApplicationStatusEvents,
  payApplications,
  portalPasswordResetTokens,
  projects,
  subcontractorInvitations,
  subcontractors,
} from "@foreman/db";
import { db } from "../database";
import { badRequest, unauthorized, notFound } from "../lib/errors";
import { env } from "../config/env";
import { enqueueNotificationDelivery } from "../lib/queues";
import { applyComplianceTemplatesForSubcontractor, hashToken, issueOneTimeToken } from "./subconnect-utils";

function getJwtSecret(): string {
  const secret = env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required for portal authentication");
  }
  return secret;
}

export interface PortalSession {
  subcontractorId: string;
  organizationId: string;
  email: string;
  name: string;
  projectId?: string | null;
}

interface PortalPayApplicationLineItemInput {
  description: string;
  costCode?: string;
  quantityUnits?: number;
  unitAmountCents?: number;
  amountCents: number;
  evidence?: Record<string, unknown>;
}

interface PortalCreatePayApplicationInput {
  periodStart: string;
  periodEnd: string;
  summary?: string;
  currency?: string;
  evidence?: Record<string, unknown>;
  lineItems: PortalPayApplicationLineItemInput[];
}

interface PortalCreateDailyLogInput {
  logDate: string;
  laborCount: number;
  equipmentUsed?: string[];
  performedWork: string;
  attachments?: string[];
  metadata?: Record<string, unknown>;
}

const isUniqueConstraintError = (error: unknown, constraintName: string): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const cause = (error as Error & { cause?: { code?: string; constraint?: string } }).cause;

  return cause?.code === "23505" && cause?.constraint === constraintName;
};

function isPortalSelfRegistrationEnabled() {
  return env.PORTAL_ALLOW_PROJECT_CODE_REGISTRATION !== false;
}

async function loadActivePortalSubcontractor(subcontractorId: string, organizationId: string) {
  const [subcontractor] = await db
    .select()
    .from(subcontractors)
    .where(
      and(
        eq(subcontractors.id, subcontractorId),
        eq(subcontractors.organizationId, organizationId),
        eq(subcontractors.portalEnabled, true),
        eq(subcontractors.status, "active"),
        isNull(subcontractors.deletedAt),
      ),
    )
    .limit(1);

  if (!subcontractor) {
    throw unauthorized("Portal account is not active");
  }

  return subcontractor;
}

function issuePortalJwt(subcontractor: {
  id: string;
  organizationId: string;
  email: string | null;
  name: string;
  projectId: string | null;
}) {
  if (!subcontractor.email) {
    throw unauthorized("Portal account email is missing");
  }

  const token = jwt.sign(
    {
      subcontractorId: subcontractor.id,
      organizationId: subcontractor.organizationId,
      email: subcontractor.email,
      name: subcontractor.name,
      projectId: subcontractor.projectId,
    },
    getJwtSecret(),
    { expiresIn: "7d" },
  );

  return token;
}

function mergePortalAssignmentMetadata(input: {
  metadata: Record<string, unknown> | null;
  assignedScope?: string | null;
  milestones?: string[] | null;
  invitedAt?: string;
  invitedByUserId?: string;
}) {
  const metadata = input.metadata ?? {};
  const existingAssignment =
    metadata.portalAssignment && typeof metadata.portalAssignment === "object" && !Array.isArray(metadata.portalAssignment)
      ? (metadata.portalAssignment as Record<string, unknown>)
      : {};

  return {
    ...metadata,
    portalAssignment: {
      ...existingAssignment,
      ...(input.assignedScope !== undefined ? { assignedScope: input.assignedScope } : {}),
      ...(input.milestones !== undefined ? { milestones: input.milestones } : {}),
      ...(input.invitedAt !== undefined ? { invitedAt: input.invitedAt } : {}),
      ...(input.invitedByUserId !== undefined ? { invitedByUserId: input.invitedByUserId } : {}),
    },
  };
}

export const portalAuthService = {
  async register(
    email: string,
    password: string,
    name: string,
    trade: string,
    phone: string | null,
    projectCode: string,
  ) {
    if (!isPortalSelfRegistrationEnabled()) {
      throw badRequest("Portal self-registration by project code is disabled. Please use an invitation link.");
    }

    // Look up project by code to get organization ID
    const [project] = await db
      .select({ id: projects.id, organizationId: projects.organizationId })
      .from(projects)
      .where(and(eq(projects.code, projectCode), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      throw badRequest("Invalid project code. Please check with your general contractor.");
    }

    const existingEmail = await db
      .select()
      .from(subcontractors)
      .where(
        and(
          eq(subcontractors.email, email),
          eq(subcontractors.organizationId, project.organizationId),
          isNull(subcontractors.deletedAt),
        ),
      )
      .limit(1);

    if (existingEmail.length > 0) {
      throw badRequest("Email already registered for this organization");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let subcontractor;

    try {
      [subcontractor] = await db
        .insert(subcontractors)
        .values({
          organizationId: project.organizationId,
          projectId: project.id,
          name,
          email,
          phone: phone ?? null,
          trade,
          status: "active",
          passwordHash,
          portalEnabled: true,
        })
        .returning();
    } catch (error) {
      if (isUniqueConstraintError(error, "subcontractors_org_name_unique")) {
        throw badRequest("A subcontractor with this name already exists");
      }

      throw error;
    }

    if (!subcontractor) {
      throw badRequest("Failed to create subcontractor account");
    }

    await applyComplianceTemplatesForSubcontractor({
      organizationId: subcontractor.organizationId,
      projectId: project.id,
      subcontractorId: subcontractor.id,
    });

    return {
      id: subcontractor.id,
      email: subcontractor.email,
      name: subcontractor.name,
      projectId: subcontractor.projectId,
      message: "Successfully registered. You can now login.",
    };
  },

  async login(email: string, password: string) {
    const [subcontractor] = await db
      .select()
      .from(subcontractors)
      .where(
        and(
          eq(subcontractors.email, email),
          eq(subcontractors.portalEnabled, true),
          eq(subcontractors.status, "active"),
          isNull(subcontractors.deletedAt),
        ),
      )
      .limit(1);

    if (!subcontractor) {
      throw unauthorized("Invalid email or password");
    }

    if (!subcontractor.passwordHash) {
      throw unauthorized("Portal access not configured for this account");
    }

    const passwordMatch = await bcrypt.compare(password, subcontractor.passwordHash);
    if (!passwordMatch) {
      throw unauthorized("Invalid email or password");
    }

    // Update last login
    await db
      .update(subcontractors)
      .set({ lastPortalLoginAt: new Date() })
      .where(eq(subcontractors.id, subcontractor.id));

    const token = issuePortalJwt(subcontractor);

    return {
      token,
      subcontractor: {
        id: subcontractor.id,
        email: subcontractor.email,
        name: subcontractor.name,
        trade: subcontractor.trade,
        projectId: subcontractor.projectId,
      },
    };
  },

  async verifyToken(token: string): Promise<PortalSession> {
    try {
      const payload = jwt.verify(token, getJwtSecret()) as PortalSession;
      return payload;
    } catch (error) {
      throw unauthorized("Invalid or expired token");
    }
  },

  async acceptInvitation(token: string, password: string, name?: string, phone?: string) {
    const tokenHash = hashToken(token);
    const now = new Date();

    const [invitation] = await db
      .select()
      .from(subcontractorInvitations)
      .where(
        and(
          eq(subcontractorInvitations.tokenHash, tokenHash),
          eq(subcontractorInvitations.status, "pending"),
          gte(subcontractorInvitations.expiresAt, now),
        ),
      )
      .orderBy(desc(subcontractorInvitations.createdAt))
      .limit(1);

    if (!invitation) {
      throw unauthorized("Invitation token is invalid or expired");
    }

    const [existing] = await db
      .select()
      .from(subcontractors)
      .where(
        and(
          eq(subcontractors.id, invitation.subcontractorId),
          eq(subcontractors.organizationId, invitation.organizationId),
          isNull(subcontractors.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      throw notFound("Subcontractor account was not found");
    }

    if (existing.status !== "active") {
      throw badRequest("Subcontractor account is not active");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const metadata =
      existing.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
        ? (existing.metadata as Record<string, unknown>)
        : {};

    const mergedMetadata = mergePortalAssignmentMetadata({
      metadata,
      assignedScope: invitation.assignedScope ?? null,
      milestones: Array.isArray(invitation.milestones) ? invitation.milestones : [],
      invitedAt: invitation.invitedAt.toISOString(),
      invitedByUserId: invitation.invitedByUserId,
    });

    const [updated] = await db
      .update(subcontractors)
      .set({
        name: name ?? existing.name,
        phone: phone ?? existing.phone,
        email: invitation.email,
        projectId: invitation.projectId,
        portalEnabled: true,
        passwordHash,
        metadata: mergedMetadata,
        updatedAt: now,
      })
      .where(eq(subcontractors.id, existing.id))
      .returning();

    await db
      .update(subcontractorInvitations)
      .set({
        status: "accepted",
        acceptedAt: now,
        updatedAt: now,
      })
      .where(eq(subcontractorInvitations.id, invitation.id));

    await db
      .update(subcontractorInvitations)
      .set({ status: "revoked", updatedAt: now })
      .where(
        and(
          eq(subcontractorInvitations.organizationId, invitation.organizationId),
          eq(subcontractorInvitations.subcontractorId, invitation.subcontractorId),
          eq(subcontractorInvitations.status, "pending"),
        ),
      );

    await applyComplianceTemplatesForSubcontractor({
      organizationId: invitation.organizationId,
      projectId: invitation.projectId,
      subcontractorId: invitation.subcontractorId,
    });

    if (!updated) {
      throw badRequest("Failed to activate portal account");
    }

    const jwtToken = issuePortalJwt(updated);

    return {
      token: jwtToken,
      subcontractor: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        trade: updated.trade,
        projectId: updated.projectId,
      },
    };
  },

  async requestPasswordReset(email: string) {
    const [subcontractor] = await db
      .select()
      .from(subcontractors)
      .where(
        and(
          eq(subcontractors.email, email),
          eq(subcontractors.portalEnabled, true),
          eq(subcontractors.status, "active"),
          isNull(subcontractors.deletedAt),
        ),
      )
      .limit(1);

    if (!subcontractor || !subcontractor.email) {
      return { accepted: true };
    }

    const now = new Date();
    const rawToken = issueOneTimeToken();
    const tokenHash = hashToken(rawToken);
    const resetExpiryMinutes = env.PORTAL_PASSWORD_RESET_EXPIRY_MINUTES ?? 120;
    const expiresAt = new Date(Date.now() + resetExpiryMinutes * 60 * 1000);

    await db
      .update(portalPasswordResetTokens)
      .set({
        usedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(portalPasswordResetTokens.organizationId, subcontractor.organizationId),
          eq(portalPasswordResetTokens.subcontractorId, subcontractor.id),
          isNull(portalPasswordResetTokens.usedAt),
        ),
      );

    await db.insert(portalPasswordResetTokens).values({
      organizationId: subcontractor.organizationId,
      subcontractorId: subcontractor.id,
      tokenHash,
      requestedAt: now,
      expiresAt,
      metadata: {
        email: subcontractor.email,
      },
    });

    const resetUrl = `${env.BETTER_AUTH_URL}/portal/reset-password?token=${rawToken}`;
    await enqueueNotificationDelivery({
      toEmail: subcontractor.email,
      subject: "Foreman SubConnect Password Reset",
      body:
        `A password reset was requested for your SubConnect account. ` +
        `Use this secure link to reset your password: ${resetUrl}. ` +
        `If prompted for token, use: ${rawToken}. This token expires on ${expiresAt.toISOString()}.`,
    });

    return {
      accepted: true,
      resetToken: rawToken,
      resetUrl,
      expiresAt,
    };
  },

  async confirmPasswordReset(token: string, password: string) {
    const tokenHash = hashToken(token);
    const now = new Date();

    const [resetRecord] = await db
      .select()
      .from(portalPasswordResetTokens)
      .where(
        and(
          eq(portalPasswordResetTokens.tokenHash, tokenHash),
          isNull(portalPasswordResetTokens.usedAt),
          gte(portalPasswordResetTokens.expiresAt, now),
        ),
      )
      .orderBy(desc(portalPasswordResetTokens.createdAt))
      .limit(1);

    if (!resetRecord) {
      throw unauthorized("Password reset token is invalid or expired");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db
      .update(subcontractors)
      .set({
        passwordHash,
        portalEnabled: true,
        updatedAt: now,
      })
      .where(
        and(
          eq(subcontractors.id, resetRecord.subcontractorId),
          eq(subcontractors.organizationId, resetRecord.organizationId),
          isNull(subcontractors.deletedAt),
        ),
      );

    await db
      .update(portalPasswordResetTokens)
      .set({
        usedAt: now,
        updatedAt: now,
      })
      .where(eq(portalPasswordResetTokens.id, resetRecord.id));

    return { success: true };
  },

  async getUserCompliance(subcontractorId: string, organizationId: string) {
    const subcontractor = await loadActivePortalSubcontractor(subcontractorId, organizationId);

    const filters = [
      eq(complianceItems.subcontractorId, subcontractorId),
      eq(complianceItems.organizationId, organizationId),
      isNull(complianceItems.deletedAt),
    ];

    if (subcontractor.projectId) {
      filters.push(eq(complianceItems.projectId, subcontractor.projectId));
    }

    const items = await db
      .select()
      .from(complianceItems)
      .where(and(...filters))
      .orderBy(asc(complianceItems.dueDate));

    return items;
  },

  async updateComplianceEvidence(
    subcontractorId: string,
    organizationId: string,
    complianceItemId: string,
    evidence: string | null,
    notes: string | null,
  ) {
    const subcontractor = await loadActivePortalSubcontractor(subcontractorId, organizationId);

    const filters = [
      eq(complianceItems.id, complianceItemId),
      eq(complianceItems.subcontractorId, subcontractorId),
      eq(complianceItems.organizationId, organizationId),
      isNull(complianceItems.deletedAt),
    ];

    if (subcontractor.projectId) {
      filters.push(eq(complianceItems.projectId, subcontractor.projectId));
    }

    const [item] = await db
      .select()
      .from(complianceItems)
      .where(and(...filters))
      .limit(1);

    if (!item) {
      throw notFound("Compliance item not found");
    }

    const existingEvidence =
      item.evidence && typeof item.evidence === "object" && !Array.isArray(item.evidence)
        ? (item.evidence as Record<string, unknown>)
        : {};
    const existingUploads = Array.isArray(existingEvidence.uploads)
      ? (existingEvidence.uploads as Array<Record<string, unknown>>)
      : [];
    const uploadTrace =
      evidence === null
        ? null
        : {
            type: "portal_upload",
            value: evidence,
            uploadedAt: new Date().toISOString(),
            uploadedBySubcontractorId: subcontractor.id,
            uploadedByEmail: subcontractor.email,
            status: "pending",
          };

    const evidencePayload =
      evidence === null
        ? {
            ...existingEvidence,
            lastStatus: "pending",
            needsReviewerConfirmation: item.highRisk,
          }
        : {
            ...existingEvidence,
            type: "portal_upload",
            value: evidence,
            uploadedAt: new Date().toISOString(),
            uploadedBySubcontractorId: subcontractor.id,
            uploadedByEmail: subcontractor.email,
            lastStatus: "pending",
            needsReviewerConfirmation: item.highRisk,
            uploads: uploadTrace ? [...existingUploads, uploadTrace] : existingUploads,
          };

    const [updated] = await db
      .update(complianceItems)
      .set({
        evidence: evidencePayload,
        notes: notes ?? item.notes,
        status: "pending",
        reviewerConfirmedAt: null,
        reviewerConfirmedByUserId: null,
        updatedAt: new Date(),
      })
      .where(eq(complianceItems.id, complianceItemId))
      .returning();

    return updated;
  },

  async getPortalOverview(subcontractorId: string, organizationId: string) {
    const subcontractor = await loadActivePortalSubcontractor(subcontractorId, organizationId);

    const [project, compliance, recentPayApps, recentDailyLogs] = await Promise.all([
      subcontractor.projectId
        ? db
            .select({
              id: projects.id,
              code: projects.code,
              name: projects.name,
              status: projects.status,
              startDate: projects.startDate,
              endDate: projects.endDate,
            })
            .from(projects)
            .where(
              and(
                eq(projects.id, subcontractor.projectId),
                eq(projects.organizationId, organizationId),
                isNull(projects.deletedAt),
              ),
            )
            .limit(1)
            .then((rows) => rows[0] ?? null)
        : Promise.resolve(null),
      this.getUserCompliance(subcontractor.id, organizationId),
      db
        .select({
          id: payApplications.id,
          status: payApplications.status,
          totalAmountCents: payApplications.totalAmountCents,
          currency: payApplications.currency,
          submittedAt: payApplications.submittedAt,
          reviewedAt: payApplications.reviewedAt,
          updatedAt: payApplications.updatedAt,
        })
        .from(payApplications)
        .where(
          and(
            eq(payApplications.organizationId, organizationId),
            eq(payApplications.subcontractorId, subcontractor.id),
            subcontractor.projectId ? eq(payApplications.projectId, subcontractor.projectId) : undefined,
            isNull(payApplications.deletedAt),
          ),
        )
        .orderBy(desc(payApplications.createdAt))
        .limit(10),
      db
        .select({
          id: dailyLogs.id,
          logDate: dailyLogs.logDate,
          reviewStatus: dailyLogs.reviewStatus,
          submittedAt: dailyLogs.submittedAt,
          reviewedAt: dailyLogs.reviewedAt,
        })
        .from(dailyLogs)
        .where(
          and(
            eq(dailyLogs.organizationId, organizationId),
            eq(dailyLogs.subcontractorId, subcontractor.id),
            subcontractor.projectId ? eq(dailyLogs.projectId, subcontractor.projectId) : undefined,
            isNull(dailyLogs.deletedAt),
          ),
        )
        .orderBy(desc(dailyLogs.logDate), desc(dailyLogs.createdAt))
        .limit(10),
    ]);

    const now = Date.now();
    const dueSoonCutoff = now + 14 * 24 * 60 * 60 * 1000;
    const complianceSummary = compliance.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === "pending") {
          acc.pending += 1;
        }
        if (item.status === "verified") {
          acc.verified += 1;
        }
        if (item.status === "expiring") {
          acc.expiring += 1;
        }
        if (item.status === "compliant") {
          acc.compliant += 1;
        }
        if (item.status === "non_compliant") {
          acc.nonCompliant += 1;
        }
        if (item.status === "expired") {
          acc.expired += 1;
        }

        const dueAt = item.dueDate?.getTime();
        if (typeof dueAt === "number") {
          if (dueAt < now && item.status !== "verified" && item.status !== "compliant") {
            acc.overdue += 1;
          }
          if (dueAt >= now && dueAt <= dueSoonCutoff && item.status !== "verified" && item.status !== "compliant") {
            acc.dueSoon += 1;
          }
        }

        return acc;
      },
      {
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
    );

    const metadata =
      subcontractor.metadata && typeof subcontractor.metadata === "object" && !Array.isArray(subcontractor.metadata)
        ? (subcontractor.metadata as Record<string, unknown>)
        : {};
    const portalAssignment =
      metadata.portalAssignment && typeof metadata.portalAssignment === "object" && !Array.isArray(metadata.portalAssignment)
        ? (metadata.portalAssignment as Record<string, unknown>)
        : {};

    return {
      subcontractor: {
        id: subcontractor.id,
        name: subcontractor.name,
        email: subcontractor.email,
        phone: subcontractor.phone,
        trade: subcontractor.trade,
        status: subcontractor.status,
      },
      project,
      assignedScope:
        typeof portalAssignment.assignedScope === "string" ? portalAssignment.assignedScope : subcontractor.trade,
      milestones: Array.isArray(portalAssignment.milestones) ? portalAssignment.milestones : [],
      complianceSummary,
      complianceItems: compliance,
      timeline: {
        lastPortalLoginAt: subcontractor.lastPortalLoginAt,
        invitedAt:
          typeof portalAssignment.invitedAt === "string" || portalAssignment.invitedAt === null
            ? portalAssignment.invitedAt
            : null,
        payApplications: recentPayApps,
        dailyLogs: recentDailyLogs,
      },
    };
  },

  async listPortalPayApplications(
    subcontractorId: string,
    organizationId: string,
    options: { status?: "draft" | "submitted" | "under_review" | "approved" | "rejected" | "paid"; limit: number },
  ) {
    const subcontractor = await loadActivePortalSubcontractor(subcontractorId, organizationId);
    const filters = [
      eq(payApplications.organizationId, organizationId),
      eq(payApplications.subcontractorId, subcontractor.id),
      isNull(payApplications.deletedAt),
    ];

    if (subcontractor.projectId) {
      filters.push(eq(payApplications.projectId, subcontractor.projectId));
    }

    if (options.status) {
      filters.push(eq(payApplications.status, options.status));
    }

    return await db
      .select()
      .from(payApplications)
      .where(and(...filters))
      .orderBy(desc(payApplications.createdAt))
      .limit(options.limit);
  },

  async submitPortalPayApplication(
    subcontractorId: string,
    organizationId: string,
    input: PortalCreatePayApplicationInput,
  ) {
    const subcontractor = await loadActivePortalSubcontractor(subcontractorId, organizationId);
    if (!subcontractor.projectId) {
      throw badRequest("No project scope assigned for this subcontractor");
    }

    const periodStart = new Date(input.periodStart);
    const periodEnd = new Date(input.periodEnd);
    if (periodStart > periodEnd) {
      throw badRequest("periodStart cannot be after periodEnd");
    }

    const totalAmountCents = input.lineItems.reduce((sum, item) => sum + item.amountCents, 0);
    const now = new Date();

    const [record] = await db
      .insert(payApplications)
      .values({
        organizationId,
        projectId: subcontractor.projectId,
        subcontractorId: subcontractor.id,
        periodStart,
        periodEnd,
        status: "submitted",
        totalAmountCents,
        currency: input.currency ?? "USD",
        summary: input.summary ?? null,
        evidence: input.evidence ?? null,
        submittedAt: now,
        metadata: {
          submittedBy: "portal",
        },
      })
      .returning();

    const lineItems = await db
      .insert(payApplicationLineItems)
      .values(
        input.lineItems.map((item) => ({
          payApplicationId: record.id,
          description: item.description,
          costCode: item.costCode ?? null,
          quantityUnits: item.quantityUnits ?? 1,
          unitAmountCents: item.unitAmountCents ?? null,
          amountCents: item.amountCents,
          evidence: item.evidence ?? null,
          metadata: null,
        })),
      )
      .returning();

    await db.insert(payApplicationStatusEvents).values({
      payApplicationId: record.id,
      organizationId,
      projectId: record.projectId,
      subcontractorId: subcontractor.id,
      status: "submitted",
      actorType: "subcontractor",
      actorId: subcontractor.id,
      reason: "Submitted via portal",
      metadata: null,
    });

    return {
      ...record,
      lineItems,
    };
  },

  async getPortalPayApplication(subcontractorId: string, organizationId: string, payApplicationId: string) {
    const subcontractor = await loadActivePortalSubcontractor(subcontractorId, organizationId);

    const [record] = await db
      .select()
      .from(payApplications)
      .where(
        and(
          eq(payApplications.id, payApplicationId),
          eq(payApplications.organizationId, organizationId),
          eq(payApplications.subcontractorId, subcontractor.id),
          subcontractor.projectId ? eq(payApplications.projectId, subcontractor.projectId) : undefined,
          isNull(payApplications.deletedAt),
        ),
      )
      .limit(1);

    if (!record) {
      throw notFound("Pay application not found");
    }

    const [lineItems, timeline] = await Promise.all([
      db
        .select()
        .from(payApplicationLineItems)
        .where(eq(payApplicationLineItems.payApplicationId, record.id))
        .orderBy(desc(payApplicationLineItems.createdAt)),
      db
        .select()
        .from(payApplicationStatusEvents)
        .where(eq(payApplicationStatusEvents.payApplicationId, record.id))
        .orderBy(desc(payApplicationStatusEvents.createdAt)),
    ]);

    return {
      ...record,
      lineItems,
      timeline,
    };
  },

  async listPortalDailyLogs(
    subcontractorId: string,
    organizationId: string,
    options: { reviewStatus?: "pending" | "reviewed" | "rejected"; limit: number },
  ) {
    const subcontractor = await loadActivePortalSubcontractor(subcontractorId, organizationId);
    const filters = [
      eq(dailyLogs.organizationId, organizationId),
      eq(dailyLogs.subcontractorId, subcontractor.id),
      isNull(dailyLogs.deletedAt),
    ];

    if (subcontractor.projectId) {
      filters.push(eq(dailyLogs.projectId, subcontractor.projectId));
    }

    if (options.reviewStatus) {
      filters.push(eq(dailyLogs.reviewStatus, options.reviewStatus));
    }

    return await db
      .select()
      .from(dailyLogs)
      .where(and(...filters))
      .orderBy(desc(dailyLogs.logDate), desc(dailyLogs.createdAt))
      .limit(options.limit);
  },

  async submitPortalDailyLog(subcontractorId: string, organizationId: string, input: PortalCreateDailyLogInput) {
    const subcontractor = await loadActivePortalSubcontractor(subcontractorId, organizationId);
    if (!subcontractor.projectId) {
      throw badRequest("No project scope assigned for this subcontractor");
    }

    const logDate = new Date(input.logDate);

    const [record] = await db
      .insert(dailyLogs)
      .values({
        organizationId,
        projectId: subcontractor.projectId,
        subcontractorId: subcontractor.id,
        logDate,
        laborCount: input.laborCount,
        equipmentUsed: input.equipmentUsed ?? [],
        performedWork: input.performedWork,
        attachments: input.attachments ?? [],
        reviewStatus: "pending",
        metadata: input.metadata ?? null,
      })
      .returning();

    await db.insert(dailyLogStatusEvents).values({
      dailyLogId: record.id,
      organizationId,
      projectId: record.projectId,
      subcontractorId: subcontractor.id,
      status: "pending",
      actorType: "subcontractor",
      actorId: subcontractor.id,
      reason: "Submitted via portal",
      metadata: null,
    });

    return record;
  },

  async getPortalDailyLog(subcontractorId: string, organizationId: string, dailyLogId: string) {
    const subcontractor = await loadActivePortalSubcontractor(subcontractorId, organizationId);

    const [record] = await db
      .select()
      .from(dailyLogs)
      .where(
        and(
          eq(dailyLogs.id, dailyLogId),
          eq(dailyLogs.organizationId, organizationId),
          eq(dailyLogs.subcontractorId, subcontractor.id),
          subcontractor.projectId ? eq(dailyLogs.projectId, subcontractor.projectId) : undefined,
          isNull(dailyLogs.deletedAt),
        ),
      )
      .limit(1);

    if (!record) {
      throw notFound("Daily log not found");
    }

    const timeline = await db
      .select()
      .from(dailyLogStatusEvents)
      .where(eq(dailyLogStatusEvents.dailyLogId, record.id))
      .orderBy(desc(dailyLogStatusEvents.createdAt));

    return {
      ...record,
      timeline,
    };
  },
};
