import { beforeEach, describe, expect, it, vi } from "vitest";

const { createNotificationMock } = vi.hoisted(() => ({
  createNotificationMock: vi.fn(),
}));

vi.mock("../../src/services/notification", () => ({
  notificationService: {
    create: createNotificationMock,
  },
}));

import { eventService } from "../../src/services/events";

describe("eventService", () => {
  beforeEach(() => {
    createNotificationMock.mockReset();
  });

  it("emits payment.received notifications for all recipients", async () => {
    createNotificationMock.mockResolvedValue({ id: "noti-1" });

    await eventService.emit({
      event: "payment.received",
      organizationId: "org-1",
      title: "Payment Received",
      message: "A payment was received",
      recipients: ["user-1", "user-2"],
      metadata: { billingRecordId: "bill-1" },
    });

    expect(createNotificationMock).toHaveBeenCalledTimes(2);
    expect(createNotificationMock).toHaveBeenNthCalledWith(1, {
      organizationId: "org-1",
      userId: "user-1",
      type: "payment.received",
      title: "Payment Received",
      message: "A payment was received",
      metadata: { billingRecordId: "bill-1" },
    });
    expect(createNotificationMock).toHaveBeenNthCalledWith(2, {
      organizationId: "org-1",
      userId: "user-2",
      type: "payment.received",
      title: "Payment Received",
      message: "A payment was received",
      metadata: { billingRecordId: "bill-1" },
    });
  });

  it("skips notification creation when recipients are missing", async () => {
    await eventService.emit({
      event: "invoice.created",
      organizationId: "org-1",
      title: "Invoice Created",
      message: "A new invoice was created",
    });

    expect(createNotificationMock).not.toHaveBeenCalled();
  });

  it("emits events in batch", async () => {
    createNotificationMock.mockResolvedValue({ id: "noti-1" });

    await eventService.emitBatch([
      {
        event: "payment.received",
        organizationId: "org-1",
        title: "Payment 1",
        message: "Payment 1 received",
        recipients: ["user-1"],
      },
      {
        event: "payment.failed",
        organizationId: "org-2",
        title: "Payment 2 failed",
        message: "Payment 2 failed",
        recipients: ["user-2"],
      },
    ]);

    expect(createNotificationMock).toHaveBeenCalledTimes(2);
  });

  it("does not throw when notification creation fails", async () => {
    createNotificationMock.mockRejectedValue(new Error("Queue unavailable"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      eventService.emit({
        event: "payment.received",
        organizationId: "org-1",
        title: "Payment Received",
        message: "A payment was received",
        recipients: ["user-1"],
      }),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("supports custom event handler registration", async () => {
    const customHandler = vi.fn().mockResolvedValue(undefined);
    eventService.registerHandler("invoice.created", customHandler);

    const payload = {
      event: "invoice.created" as const,
      organizationId: "org-1",
      title: "Invoice Created",
      message: "A new invoice was created",
      recipients: ["user-1"],
    };

    await eventService.emit(payload);

    expect(customHandler).toHaveBeenCalledTimes(1);
    expect(customHandler).toHaveBeenCalledWith(payload);
  });
});
