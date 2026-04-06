import { and, eq, lte, sql } from "drizzle-orm";
import { organizationSubscriptions, usageEvents } from "@foreman/db";
import { db } from "../database";
import { forbidden } from "../lib/errors";

const DEFAULT_PLAN = "starter" as const;

function getDefaultsForPlan(plan: string) {
  switch (plan) {
    case "enterprise":
      return { aiCreditsIncluded: 100000, allowOverage: true, overagePriceCents: 0 };
    case "growth":
      return { aiCreditsIncluded: 20000, allowOverage: true, overagePriceCents: 2 };
    default:
      return { aiCreditsIncluded: 1500, allowOverage: false, overagePriceCents: 0 };
  }
}

function estimateUnits(prompt: string) {
  return Math.max(1, Math.ceil(prompt.length / 4));
}

async function rolloverCycleIfNeeded(subscription: typeof organizationSubscriptions.$inferSelect) {
  if (subscription.cycleEndAt > new Date()) {
    return subscription;
  }

  const nextStart = new Date();
  const nextEnd = new Date(nextStart);
  nextEnd.setUTCDate(nextEnd.getUTCDate() + 30);

  const [updated] = await db
    .update(organizationSubscriptions)
    .set({
      aiCreditsUsed: 0,
      cycleStartAt: nextStart,
      cycleEndAt: nextEnd,
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(organizationSubscriptions.id, subscription.id))
    .returning();

  return updated;
}

export const entitlementsService = {
  estimateAiUnits(prompt: string) {
    return estimateUnits(prompt);
  },

  async getOrCreateSubscription(organizationId: string) {
    const [existing] = await db
      .select()
      .from(organizationSubscriptions)
      .where(eq(organizationSubscriptions.organizationId, organizationId))
      .limit(1);

    if (existing) {
      return await rolloverCycleIfNeeded(existing);
    }

    const defaults = getDefaultsForPlan(DEFAULT_PLAN);
    const start = new Date();
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 30);

    const [created] = await db
      .insert(organizationSubscriptions)
      .values({
        organizationId,
        plan: DEFAULT_PLAN,
        status: "active",
        aiCreditsIncluded: defaults.aiCreditsIncluded,
        aiCreditsUsed: 0,
        allowOverage: defaults.allowOverage,
        overagePriceCents: defaults.overagePriceCents,
        cycleStartAt: start,
        cycleEndAt: end,
      })
      .returning();

    return created;
  },

  async assertAiUsageAllowed(organizationId: string, units: number) {
    const subscription = await this.getOrCreateSubscription(organizationId);

    if (subscription.status === "suspended") {
      throw forbidden("Subscription is suspended. Update billing to continue.");
    }

    const nextUsage = subscription.aiCreditsUsed + units;
    if (!subscription.allowOverage && nextUsage > subscription.aiCreditsIncluded) {
      throw forbidden("AI quota exceeded for current billing cycle.");
    }

    return subscription;
  },

  async recordAiUsage(input: {
    organizationId: string;
    subscriptionId: string;
    units: number;
    source: string;
    model: string;
    metadata?: Record<string, unknown>;
  }) {
    await db.insert(usageEvents).values({
      organizationId: input.organizationId,
      subscriptionId: input.subscriptionId,
      eventType: "ai_generation",
      feature: "ai.generate",
      units: input.units,
      source: input.source,
      model: input.model,
      metadata: input.metadata ?? null,
    });

    const [updated] = await db
      .update(organizationSubscriptions)
      .set({
        aiCreditsUsed: sql`${organizationSubscriptions.aiCreditsUsed} + ${input.units}`,
        updatedAt: new Date(),
      })
      .where(and(eq(organizationSubscriptions.id, input.subscriptionId), eq(organizationSubscriptions.organizationId, input.organizationId)))
      .returning();

    return updated;
  },

  async getUsageSummary(organizationId: string) {
    const subscription = await this.getOrCreateSubscription(organizationId);
    const remainingCredits = Math.max(0, subscription.aiCreditsIncluded - subscription.aiCreditsUsed);

    return {
      plan: subscription.plan,
      status: subscription.status,
      aiCreditsIncluded: subscription.aiCreditsIncluded,
      aiCreditsUsed: subscription.aiCreditsUsed,
      remainingCredits,
      allowOverage: subscription.allowOverage,
      overagePriceCents: subscription.overagePriceCents,
      cycleStartAt: subscription.cycleStartAt,
      cycleEndAt: subscription.cycleEndAt,
      graceEndsAt: subscription.graceEndsAt,
    };
  },

  async performUsageCycleRollover(now: Date = new Date()) {
    const subscriptions = await db
      .select()
      .from(organizationSubscriptions)
      .where(lte(organizationSubscriptions.cycleEndAt, now));

    if (subscriptions.length === 0) {
      return { rolledOver: 0 };
    }

    let rolledOver = 0;
    for (const subscription of subscriptions) {
      await rolloverCycleIfNeeded(subscription);
      rolledOver += 1;
    }

    return { rolledOver };
  },
};
