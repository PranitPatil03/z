import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app";

describe("app routes", () => {
  it("returns API status on root endpoint", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      name: "Foreman API",
      status: "ok",
    });
  });

  it("returns service health payload", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "ok",
      service: "api",
    });
    expect(typeof response.body.time).toBe("string");
    expect(Number.isNaN(Date.parse(response.body.time))).toBe(false);
  });

  it("returns readiness payload", async () => {
    const response = await request(app).get("/health/ready");

    expect([200, 503]).toContain(response.status);
    expect(response.body).toMatchObject({
      service: "api",
      ready: expect.any(Boolean),
      checks: {
        database: { status: expect.any(String) },
        redis: { status: expect.any(String) },
        storage: { status: expect.any(String) },
        email: { status: expect.any(String) },
      },
    });
    expect(typeof response.body.time).toBe("string");
    expect(Number.isNaN(Date.parse(response.body.time))).toBe(false);
  });

  it("serves OpenAPI document", async () => {
    const response = await request(app).get("/openapi.json");

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe("3.0.3");
    expect(response.body.paths["/projects"]).toBeDefined();
    expect(response.body.paths["/projects/{projectId}"]).toBeDefined();
    expect(response.body.paths["/activity-feed/entity/{entityType}/{entityId}"]).toBeDefined();
    expect(response.body.paths["/billing/webhook/stripe"]).toBeDefined();
    expect(response.body.paths["/auth/oauth/callback"]).toBeDefined();
    expect(Object.keys(response.body.paths).length).toBeGreaterThan(50);
  });

  it("serves interactive API docs", async () => {
    const response = await request(app).get("/docs");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain("<redoc");
    expect(response.text).toContain("/openapi.json");
  });
});
