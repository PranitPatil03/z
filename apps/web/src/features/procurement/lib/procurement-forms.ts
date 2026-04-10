import { z } from "zod";

const TERMINAL_STATUSES = {
  rfq: new Set(["closed", "canceled"]),
  purchaseOrder: new Set(["approved", "closed", "canceled"]),
  receipt: new Set(["verified", "rejected"]),
  invoice: new Set(["approved", "rejected", "paid", "hold"]),
} as const;

export const invoiceOverrideSchema = z
  .object({
    allowPayOverride: z.boolean().optional(),
    payOverrideReason: z.string().trim().optional(),
  })
  .refine(
    (value) => {
      if (!value.allowPayOverride) {
        return true;
      }

      const reason = value.payOverrideReason ?? "";
      return reason.length >= 8 && reason.length <= 1000;
    },
    {
      message: "Pay override reason must be between 8 and 1000 characters",
      path: ["payOverrideReason"],
    },
  );

export type LifecycleEntity = keyof typeof TERMINAL_STATUSES;

export function requiresLifecycleConfirmation(
  entity: LifecycleEntity,
  previousStatus: string,
  nextStatus: string,
) {
  if (previousStatus === nextStatus) {
    return false;
  }

  return TERMINAL_STATUSES[entity].has(nextStatus);
}

export function getLifecycleConfirmationMessage(
  entity: LifecycleEntity,
  previousStatus: string,
  nextStatus: string,
) {
  return `Move ${entity} status from ${previousStatus} to ${nextStatus}?`;
}
