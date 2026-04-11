import {
  organizationSubscriptions,
  smartMailAccounts,
  usageEvents,
} from "@foreman/db";
import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "../database";
import { forbidden } from "../lib/errors";

const DEFAULT_PLAN = "starter" as const;
export type SubscriptionPlan = "starter" | "growth" | "enterprise";
export type BillingFeatureKey =
  | "ai.generate"
  | "smartmail.ai_draft"
  | "smartmail.sync"
  | "smartmail.multi_account";

type PlanFeatureConfig = {
  enabledFeatures: BillingFeatureKey[];
  limits: {
    smartmailAccounts: number | null;
  };
};

export function getFeatureConfigForPlan(
  plan: SubscriptionPlan | string,
): PlanFeatureConfig {
  switch (plan) {
    case "enterprise":
      return {
        enabledFeatures: [
          "ai.generate",
          "smartmail.ai_draft",
          "smartmail.sync",
          "smartmail.multi_account",
        ],
        limits: {
          smartmailAccounts: null,
        },
      };
    case "growth":
      return {
        enabledFeatures: [
          "ai.generate",
          "smartmail.ai_draft",
          "smartmail.sync",
          "smartmail.multi_account",
        ],
        limits: {
          smartmailAccounts: 5,
        },
      };
    default:
      return {
        enabledFeatures: [
          "ai.generate",
          "smartmail.ai_draft",
          "smartmail.sync",
        ],
        limits: {
          smartmailAccounts: 1,
        },
      };
  }
}

export function getDefaultsForPlan(plan: SubscriptionPlan | string) {
  switch (plan) {
    case "enterprise":
      return {
        aiCreditsIncluded: 100000,
        allowOverage: true,
        overagePriceCents: 0,
      };
    case "growth":
      return {
        aiCreditsIncluded: 20000,
        allowOverage: true,
        overagePriceCents: 2,
      };
    default:
      return {
        aiCreditsIncluded: 1500,
        allowOverage: false,
        overagePriceCents: 0,
      };
  }
}

function estimateUnits(prompt: string) {
  return Math.max(1, Math.ceil(prompt.length / 4));
}

async function rolloverCycleIfNeeded(
  subscription: typeof organizationSubscriptions.$inferSelect,
) {
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

  async assertFeatureAccess(
    organizationId: string,
    feature: BillingFeatureKey,
  ) {
    const subscription = await this.getOrCreateSubscription(organizationId);

    if (subscription.status === "suspended") {
      throw forbidden("Subscription is suspended. Update billing to continue.");
    }

    const featureConfig = getFeatureConfigForPlan(subscription.plan);
    if (!featureConfig.enabledFeatures.includes(feature)) {
      throw forbidden(
        `Feature '${feature}' is not available on the ${subscription.plan} plan.`,
      );
    }

    return subscription;
  },

  async assertSmartMailAccountAllowed(organizationId: string) {
    const subscription = await this.assertFeatureAccess(
      organizationId,
      "smartmail.sync",
    );
    const featureConfig = getFeatureConfigForPlan(subscription.plan);
    const accountLimit = featureConfig.limits.smartmailAccounts;

    if (accountLimit === null) {
      return subscription;
    }

    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(smartMailAccounts)
      .where(
        and(
          eq(smartMailAccounts.organizationId, organizationId),
          isNull(smartMailAccounts.revokedAt),
        ),
      );

    const activeAccounts = Number(row?.count ?? 0);
    if (activeAccounts >= accountLimit) {
      throw forbidden(
        `SmartMail account limit reached for ${subscription.plan} plan (${accountLimit}). Upgrade your plan to add more accounts.`,
      );
    }

    return subscription;
  },

  async assertAiUsageAllowed(organizationId: string, units: number) {
    const subscription = await this.assertFeatureAccess(
      organizationId,
      "ai.generate",
    );

    const nextUsage = subscription.aiCreditsUsed + units;
    if (
      !subscription.allowOverage &&
      nextUsage > subscription.aiCreditsIncluded
    ) {
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
    feature?: BillingFeatureKey | string;
    metadata?: Record<string, unknown>;
  }) {
    await db.insert(usageEvents).values({
      organizationId: input.organizationId,
      subscriptionId: input.subscriptionId,
      eventType: "ai_generation",
      feature: input.feature ?? "ai.generate",
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
      .where(
        and(
          eq(organizationSubscriptions.id, input.subscriptionId),
          eq(organizationSubscriptions.organizationId, input.organizationId),
        ),
      )
      .returning();

    return updated;
  },

  async getUsageSummary(organizationId: string) {
    const subscription = await this.getOrCreateSubscription(organizationId);
    const remainingCredits = Math.max(
      0,
      subscription.aiCreditsIncluded - subscription.aiCreditsUsed,
    );
    const overageUnits = Math.max(
      0,
      subscription.aiCreditsUsed - subscription.aiCreditsIncluded,
    );
    const estimatedOverageCostCents = subscription.allowOverage
      ? overageUnits * subscription.overagePriceCents
      : 0;

    const usageRows = await db
      .select({
        feature: usageEvents.feature,
        units: sql<number>`coalesce(sum(${usageEvents.units}), 0)::int`,
      })
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.organizationId, organizationId),
          gte(usageEvents.createdAt, subscription.cycleStartAt),
          lte(usageEvents.createdAt, subscription.cycleEndAt),
        ),
      )
      .groupBy(usageEvents.feature);

    const featureUsageUnits = Object.fromEntries(
      usageRows.map((row) => [row.feature, Number(row.units)]),
    );
    const featureConfig = getFeatureConfigForPlan(subscription.plan);

    return {
      plan: subscription.plan,
      status: subscription.status,
      aiCreditsIncluded: subscription.aiCreditsIncluded,
      aiCreditsUsed: subscription.aiCreditsUsed,
      remainingCredits,
      overageUnits,
      estimatedOverageCostCents,
      allowOverage: subscription.allowOverage,
      overagePriceCents: subscription.overagePriceCents,
      enabledFeatures: featureConfig.enabledFeatures,
      featureLimits: featureConfig.limits,
      featureUsageUnits,
      cycleStartAt: subscription.cycleStartAt,
      cycleEndAt: subscription.cycleEndAt,
      graceEndsAt: subscription.graceEndsAt,
    };
  },

  async changePlan(organizationId: string, plan: SubscriptionPlan) {
    const current = await this.getOrCreateSubscription(organizationId);
    const defaults = getDefaultsForPlan(plan);

    const [updated] = await db
      .update(organizationSubscriptions)
      .set({
        plan,
        aiCreditsIncluded: defaults.aiCreditsIncluded,
        allowOverage: defaults.allowOverage,
        overagePriceCents: defaults.overagePriceCents,
        updatedAt: new Date(),
      })
      .where(eq(organizationSubscriptions.organizationId, organizationId))
      .returning();

    return {
      previousPlan: current.plan,
      subscription: updated ?? current,
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
