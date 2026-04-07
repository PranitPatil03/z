import { describe, expect, it } from "vitest";
import {
  activityFeedEntityParamsSchema,
  activityFeedEntityTimelineQuerySchema,
  activityFeedProjectHealthParamsSchema,
  listActivityFeedQuerySchema,
} from "../../src/schemas/activity-feed.schema";

describe("activity feed schemas", () => {
  it("applies default pagination values", () => {
    const parsed = listActivityFeedQuerySchema.parse({});

    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(50);
  });

  it("accepts action and entity filters", () => {
    const parsed = listActivityFeedQuerySchema.parse({
      page: 2,
      pageSize: 25,
      entityType: "change_order",
      action: "approve",
      actorUserId: "user-1",
      projectId: "proj-1",
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-01-31T00:00:00.000Z",
    });

    expect(parsed.page).toBe(2);
    expect(parsed.action).toBe("approve");
    expect(parsed.projectId).toBe("proj-1");
  });

  it("rejects invalid action filters", () => {
    expect(() => listActivityFeedQuerySchema.parse({ action: "ship" })).toThrow();
  });

  it("validates project health params", () => {
    const parsed = activityFeedProjectHealthParamsSchema.parse({ projectId: "proj-1" });

    expect(parsed.projectId).toBe("proj-1");
  });

  it("validates entity timeline query and params", () => {
    const query = activityFeedEntityTimelineQuerySchema.parse({ page: 1, pageSize: 10, action: "update" });
    const params = activityFeedEntityParamsSchema.parse({ entityType: "change_order", entityId: "co-1" });

    expect(query.pageSize).toBe(10);
    expect(params.entityId).toBe("co-1");
  });
});
