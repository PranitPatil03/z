import { randomBytes, createHash } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { complianceItems, complianceRequirementTemplates } from "@foreman/db";
import { db } from "../database";

export function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function issueOneTimeToken() {
  return randomBytes(32).toString("hex");
}

export function riskLevelFromScore(scoreBps: number) {
  if (scoreBps >= 8500) {
    return "low";
  }
  if (scoreBps >= 6500) {
    return "medium";
  }
  if (scoreBps >= 4500) {
    return "high";
  }
  return "critical";
}

export async function applyComplianceTemplatesForSubcontractor(input: {
  organizationId: string;
  projectId: string;
  subcontractorId: string;
  createdAt?: Date;
  dueDateOverride?: Date;
}) {
  const templates = await db
    .select()
    .from(complianceRequirementTemplates)
    .where(
      and(
        eq(complianceRequirementTemplates.organizationId, input.organizationId),
        eq(complianceRequirementTemplates.projectId, input.projectId),
        isNull(complianceRequirementTemplates.deletedAt),
      ),
    );

  if (templates.length === 0) {
    return {
      created: 0,
      totalTemplates: 0,
    };
  }

  const complianceTypes = Array.from(new Set(templates.map((template) => template.complianceType)));

  const existing = await db
    .select({ complianceType: complianceItems.complianceType })
    .from(complianceItems)
    .where(
      and(
        eq(complianceItems.organizationId, input.organizationId),
        eq(complianceItems.projectId, input.projectId),
        eq(complianceItems.subcontractorId, input.subcontractorId),
        isNull(complianceItems.deletedAt),
        inArray(complianceItems.complianceType, complianceTypes),
      ),
    );

  const existingTypes = new Set(existing.map((row) => row.complianceType));
  const now = input.createdAt ?? new Date();

  const rowsToCreate = templates
    .filter((template) => !existingTypes.has(template.complianceType))
    .map((template) => {
      const dueDate = input.dueDateOverride
        ? input.dueDateOverride
        : new Date(now.getTime() + template.defaultDueDays * 24 * 60 * 60 * 1000);

      return {
        organizationId: input.organizationId,
        projectId: input.projectId,
        subcontractorId: input.subcontractorId,
        complianceType: template.complianceType,
        status: "pending" as const,
        highRisk: template.highRisk,
        dueDate,
        notes: `Required by template: ${template.name}`,
        evidence: {
          templateId: template.id,
          templateName: template.name,
          templateRequired: template.required,
          source: "template",
        },
      };
    });

  if (rowsToCreate.length === 0) {
    return {
      created: 0,
      totalTemplates: templates.length,
    };
  }

  await db.insert(complianceItems).values(rowsToCreate);

  return {
    created: rowsToCreate.length,
    totalTemplates: templates.length,
  };
}
