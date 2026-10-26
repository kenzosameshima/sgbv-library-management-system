import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../src/app";

describe("CORS preflight", () => {
  it("lets the allowed origin send the CSRF header on state-changing requests", async () => {
    const response = await request(app)
      .options("/api/v1/books/some-id")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "PUT")
      .set("Access-Control-Request-Headers", "content-type,x-csrf-token");

    expect(response.headers["access-control-allow-headers"]?.toLowerCase()).toContain("x-csrf-token");
  });
});
