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
});
