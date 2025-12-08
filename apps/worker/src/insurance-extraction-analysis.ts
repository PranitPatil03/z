import { complianceItems, createDb } from "@foreman/db";
import { and, eq } from "drizzle-orm";
import type pino from "pino";

interface InsuranceExtractionContext {
  type?: unknown;
  organizationId?: unknown;
  complianceItemId?: unknown;
  projectId?: unknown;
  subcontractorId?: unknown;
  highRisk?: unknown;
}

function isInsuranceExtractionContext(
  context: InsuranceExtractionContext,
): context is InsuranceExtractionContext & {
  type: "insurance_extraction";
  organizationId: string;
  complianceItemId: string;
} {
  return (
    context.type === "insurance_extraction" &&
    typeof context.organizationId === "string" &&
    context.organizationId.length > 0 &&
    typeof context.complianceItemId === "string" &&
    context.complianceItemId.length > 0
  );
}

function extractJson(output: string) {
  const trimmed = output.trim();
  const candidates = new Set<string>();

  if (trimmed.length > 0) {
    candidates.add(trimmed);
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    candidates.add(fenced[1].trim());
  }

  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.add(trimmed.slice(objectStart, objectEnd + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as Record<string, unknown>;
    } catch {
      // Continue trying the next candidate.
    }
  }

  return null;
}

export async function persistInsuranceExtraction(params: {
  output: string;
  context: InsuranceExtractionContext;
  logger: pino.Logger;
}) {
  if (!isInsuranceExtractionContext(params.context)) {
    return { handled: false as const, reason: "not_insurance_extraction_context" as const };
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    params.logger.warn("Insurance extraction persistence skipped: DATABASE_URL not configured");
    return { handled: false as const, reason: "database_unavailable" as const };
  }

  const db = createDb(databaseUrl);

  const [item] = await db
    .select()
    .from(complianceItems)
    .where(
      and(
        eq(complianceItems.id, params.context.complianceItemId),
        eq(complianceItems.organizationId, params.context.organizationId),
      ),
    )
    .limit(1);

  if (!item) {
    params.logger.warn(
      {
        complianceItemId: params.context.complianceItemId,
        organizationId: params.context.organizationId,
      },
      "Insurance extraction persistence skipped: compliance item not found",
    );
    return { handled: false as const, reason: "compliance_item_not_found" as const };
  }

  const parsed = extractJson(params.output);
  const existingEvidence =
    item.evidence && typeof item.evidence === "object" && !Array.isArray(item.evidence)
      ? (item.evidence as Record<string, unknown>)
      : {};

  const aiExtraction = {
    status: "needs_review",
    extractedAt: new Date().toISOString(),
    highRisk: item.highRisk,
    parsed,
    rawOutput: params.output,
    source: {
      projectId: params.context.projectId ?? null,
      subcontractorId: params.context.subcontractorId ?? null,
    },
  };

  const nextEvidence = {
    ...existingEvidence,
    aiExtraction,
  };

  const [updated] = await db
    .update(complianceItems)
    .set({
      evidence: nextEvidence,
      status: "pending",
      reviewerConfirmedAt: null,
      reviewerConfirmedByUserId: null,
      updatedAt: new Date(),
    })
    .where(eq(complianceItems.id, item.id))
    .returning();

  return {
    handled: true as const,
    complianceItemId: item.id,
    parsed: parsed !== null,
    updated: Boolean(updated),
  };
}
