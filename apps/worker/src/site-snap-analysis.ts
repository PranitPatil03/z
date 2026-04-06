import { createDb, notifications, siteSnapObservations, siteSnaps, users } from "@foreman/db";
import { and, eq } from "drizzle-orm";
import type pino from "pino";
import { sendNotificationEmail } from "./email";

type SiteSnapObservationCategory =
  | "work_progress"
  | "safety_issue"
  | "material_present"
  | "site_condition"
  | "equipment";

interface SiteSnapAnalysisContext {
  type?: unknown;
  siteSnapId?: unknown;
  organizationId?: unknown;
  safetyAlertMinConfidenceBps?: unknown;
}

interface ParsedSiteSnapObservation {
  category: SiteSnapObservationCategory;
  confidenceBps: number;
  detail: string;
}

const CATEGORY_SET = new Set<SiteSnapObservationCategory>([
  "work_progress",
  "safety_issue",
  "material_present",
  "site_condition",
  "equipment",
]);

const DEFAULT_SAFETY_ALERT_MIN_CONFIDENCE_BPS = 7000;

function parseSafetyThreshold(raw: unknown) {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.min(10000, Math.round(raw)));
  }

  if (typeof raw === "string") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(10000, Math.round(parsed)));
    }
  }

  return DEFAULT_SAFETY_ALERT_MIN_CONFIDENCE_BPS;
}

function normalizeConfidence(raw: unknown) {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (raw <= 1) {
      return Math.max(0, Math.min(10000, Math.round(raw * 10000)));
    }
    if (raw <= 100) {
      return Math.max(0, Math.min(10000, Math.round(raw * 100)));
    }
    return Math.max(0, Math.min(10000, Math.round(raw)));
  }

  if (typeof raw === "string") {
    const cleaned = raw.replace(/%/g, "").trim();
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) {
      return normalizeConfidence(parsed);
    }
  }

  return 6000;
}

function fallbackCategoryFromDetail(detail: string): SiteSnapObservationCategory {
  const lowered = detail.toLowerCase();

  if (
    lowered.includes("hazard") ||
    lowered.includes("unsafe") ||
    lowered.includes("safety") ||
    lowered.includes("risk")
  ) {
    return "safety_issue";
  }

  if (lowered.includes("material") || lowered.includes("delivery")) {
    return "material_present";
  }

  if (lowered.includes("equipment") || lowered.includes("machine")) {
    return "equipment";
  }

  if (lowered.includes("condition") || lowered.includes("site")) {
    return "site_condition";
  }

  return "work_progress";
}

function normalizeCategory(raw: unknown, detail: string): SiteSnapObservationCategory {
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase().replace(/\s+/g, "_") as SiteSnapObservationCategory;
    if (CATEGORY_SET.has(normalized)) {
      return normalized;
    }
  }

  return fallbackCategoryFromDetail(detail);
}

function extractJsonFromText(text: string) {
  const trimmed = text.trim();
  const candidates = new Set<string>();

  if (trimmed.length > 0) {
    candidates.add(trimmed);
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    candidates.add(fenced[1].trim());
  }

  const firstObjectStart = trimmed.indexOf("{");
  const lastObjectEnd = trimmed.lastIndexOf("}");
  if (firstObjectStart >= 0 && lastObjectEnd > firstObjectStart) {
    candidates.add(trimmed.slice(firstObjectStart, lastObjectEnd + 1));
  }

  const firstArrayStart = trimmed.indexOf("[");
  const lastArrayEnd = trimmed.lastIndexOf("]");
  if (firstArrayStart >= 0 && lastArrayEnd > firstArrayStart) {
    candidates.add(trimmed.slice(firstArrayStart, lastArrayEnd + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // Keep trying other candidates.
    }
  }

  return null;
}

function normalizeObservationRecords(records: unknown[]): ParsedSiteSnapObservation[] {
  const observations: ParsedSiteSnapObservation[] = [];

  for (const record of records) {
    if (!record || typeof record !== "object") {
      continue;
    }

    const row = record as Record<string, unknown>;
    const detailRaw = row.detail ?? row.observation ?? row.description ?? row.summary;
    const detail = typeof detailRaw === "string" ? detailRaw.trim() : "";
    if (!detail) {
      continue;
    }

    observations.push({
      category: normalizeCategory(row.category ?? row.type ?? row.label, detail),
      confidenceBps: normalizeConfidence(row.confidenceBps ?? row.confidence ?? row.score),
      detail: detail.slice(0, 500),
    });
  }

  return observations;
}

function fallbackObservationsFromText(output: string): ParsedSiteSnapObservation[] {
  const lines = output
    .split(/\n+/)
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 5);

  if (lines.length === 0) {
    return [];
  }

  return lines.map((line) => ({
    category: fallbackCategoryFromDetail(line),
    confidenceBps: normalizeConfidence(60),
    detail: line.slice(0, 500),
  }));
}

export function parseSiteSnapObservations(output: string): ParsedSiteSnapObservation[] {
  const parsed = extractJsonFromText(output);

  if (Array.isArray(parsed)) {
    const observations = normalizeObservationRecords(parsed);
    if (observations.length > 0) {
      return observations;
    }
  }

  if (parsed && typeof parsed === "object") {
    const payload = parsed as Record<string, unknown>;
    if (Array.isArray(payload.observations)) {
      const observations = normalizeObservationRecords(payload.observations);
      if (observations.length > 0) {
        return observations;
      }
    }
  }

  return fallbackObservationsFromText(output);
}

function isSiteSnapAnalysisContext(
  context: SiteSnapAnalysisContext,
): context is SiteSnapAnalysisContext & {
  type: "site_snap_analysis";
  siteSnapId: string;
  organizationId: string;
} {
  return (
    context.type === "site_snap_analysis" &&
    typeof context.siteSnapId === "string" &&
    context.siteSnapId.length > 0 &&
    typeof context.organizationId === "string" &&
    context.organizationId.length > 0
  );
}

export async function persistSiteSnapAnalysis(params: {
  output: string;
  context: SiteSnapAnalysisContext;
  logger: pino.Logger;
}) {
  if (!isSiteSnapAnalysisContext(params.context)) {
    return { handled: false as const, reason: "not_site_snap_context" as const };
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    params.logger.warn("SiteSnap AI persistence skipped: DATABASE_URL not configured");
    return { handled: false as const, reason: "database_unavailable" as const };
  }

  const db = createDb(databaseUrl);
  const now = new Date();

  const [snap] = await db
    .select()
    .from(siteSnaps)
    .where(
      and(
        eq(siteSnaps.id, params.context.siteSnapId),
        eq(siteSnaps.organizationId, params.context.organizationId),
      ),
    )
    .limit(1);

  if (!snap) {
    params.logger.warn(
      {
        siteSnapId: params.context.siteSnapId,
        organizationId: params.context.organizationId,
      },
      "SiteSnap AI persistence skipped: snap not found",
    );
    return { handled: false as const, reason: "snap_not_found" as const };
  }

  const observations = parseSiteSnapObservations(params.output);

  await db
    .delete(siteSnapObservations)
    .where(and(eq(siteSnapObservations.snapId, snap.id), eq(siteSnapObservations.source, "ai")));

  if (observations.length > 0) {
    await db.insert(siteSnapObservations).values(
      observations.map((observation) => ({
        snapId: snap.id,
        category: observation.category,
        confidenceBps: observation.confidenceBps,
        detail: observation.detail,
        source: "ai",
      })),
    );
  }

  await db
    .update(siteSnaps)
    .set({
      status: snap.status === "reviewed" ? "reviewed" : "captured",
      analysisState: "completed",
      updatedAt: now,
    })
    .where(eq(siteSnaps.id, snap.id));

  const safetyThreshold = parseSafetyThreshold(params.context.safetyAlertMinConfidenceBps);
  const highConfidenceHazards = observations.filter(
    (observation) =>
      observation.category === "safety_issue" && observation.confidenceBps >= safetyThreshold,
  );

  let hazardNotificationCreated = false;
  let hazardEmailSent = false;

  if (highConfidenceHazards.length > 0) {
    const [notification] = await db
      .insert(notifications)
      .values({
        organizationId: snap.organizationId,
        userId: snap.createdByUserId,
        type: "site_snap.safety_hazard",
        title: "Safety Hazard Detected",
        body: `${highConfidenceHazards.length} potential safety hazard(s) detected in SiteSnap ${snap.id}.`,
        metadata: {
          siteSnapId: snap.id,
          hazardCount: highConfidenceHazards.length,
          maxConfidenceBps: Math.max(...highConfidenceHazards.map((row) => row.confidenceBps)),
          thresholdBps: safetyThreshold,
        },
      })
      .returning();

    hazardNotificationCreated = Boolean(notification);

    const [recipient] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, snap.createdByUserId))
      .limit(1);

    if (recipient?.email) {
      const emailResult = await sendNotificationEmail({
        toEmail: recipient.email,
        toUserId: snap.createdByUserId,
        subject: "Safety Hazard Detected in SiteSnap",
        body: `${highConfidenceHazards.length} potential safety hazard(s) were detected for zone ${snap.locationZone}. Review the SiteSnap immediately.`,
        notificationId: notification?.id,
      });

      hazardEmailSent = emailResult.delivered;
    }
  }

  return {
    handled: true as const,
    siteSnapId: snap.id,
    observationsPersisted: observations.length,
    hazardCount: highConfidenceHazards.length,
    hazardNotificationCreated,
    hazardEmailSent,
  };
}
