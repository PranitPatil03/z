import { eq } from "drizzle-orm";
import { users, notifications } from "@foreman/db";
import { db } from "../database";
import { logger } from "../lib/logger";
import { enqueueNotificationDelivery } from "../lib/queues";
import { notificationService } from "./notification";

export type NotificationEvent =
  | "payment.received"
  | "payment.failed"
  | "change_order.submitted"
  | "change_order.approved"
  | "change_order.rejected"
  | "invoice.created"
  | "invoice.overdue"
  | "budget.threshold_exceeded"
  | "compliance.due"
  | "subscription.created"
  | "subscription.cancelled";

export interface EventPayload {
  event: NotificationEvent;
  organizationId: string;
  userId?: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  recipients?: string[]; // User IDs to notify
}

// Event handler registry
const eventHandlers: Record<NotificationEvent, (payload: EventPayload) => Promise<void>> = {
  async "payment.received"(payload) {
    await notifyUsers(payload, "Payment Received");
  },
  async "payment.failed"(payload) {
    await notifyUsersWithRole(payload, "org:admin", "Payment Failed - Action Required");
  },
  async "change_order.submitted"(payload) {
    await notifyUsersWithRole(payload, "org:approver", "New Change Order Pending Approval");
  },
  async "change_order.approved"(payload) {
    await notifyUsers(payload, "Change Order Approved");
  },
  async "change_order.rejected"(payload) {
    await notifyUsers(payload, "Change Order Rejected");
  },
  async "invoice.created"(payload) {
    await notifyUsersWithRole(payload, "org:billing", "New Invoice Created");
  },
  async "invoice.overdue"(payload) {
    await notifyUsersWithRole(payload, "org:billing", "Invoice Overdue - Payment Required");
  },
  async "budget.threshold_exceeded"(payload) {
    await notifyUsersWithRole(payload, "org:finance", "Budget Threshold Exceeded");
  },
  async "compliance.due"(payload) {
    await notifyUsersWithRole(payload, "org:compliance", "Compliance Item Due Soon");
  },
  async "subscription.created"(payload) {
    await notifyUsersWithRole(payload, "org:admin", "New Subscription Created");
  },
  async "subscription.cancelled"(payload) {
    await notifyUsersWithRole(payload, "org:admin", "Subscription Cancelled");
  },
};

// Helper functions
async function notifyUsers(payload: EventPayload, defaultTitle: string) {
  const recipients = payload.recipients || [];

  for (const userId of recipients) {
    await notificationService.create({
      organizationId: payload.organizationId,
      userId,
      type: payload.event,
      title: payload.title || defaultTitle,
      message: payload.message,
      metadata: payload.metadata,
    });
  }
}

async function notifyUsersWithRole(payload: EventPayload, role: string, defaultTitle: string) {
  // In a real implementation, look up users with specific role
  // For now, fall back to explicit recipients
  await notifyUsers(payload, defaultTitle);
}

export const eventService = {
  /**
   * Emit a system event that triggers notifications
   */
  async emit(payload: EventPayload): Promise<void> {
    try {
      const handler = eventHandlers[payload.event];
      if (handler) {
        await handler(payload);
      } else {
        logger.warn({ event: payload.event }, "No handler found for event");
      }
    } catch (error) {
      logger.error({ event: payload.event, err: error }, "Error handling event");
    }
  },

  /**
   * Emit multiple events
   */
  async emitBatch(payloads: EventPayload[]): Promise<void> {
    await Promise.all(payloads.map((p) => this.emit(p)));
  },

  /**
   * Register a custom event handler
   */
  registerHandler(event: NotificationEvent, handler: (payload: EventPayload) => Promise<void>): void {
    eventHandlers[event] = handler;
  },
};
