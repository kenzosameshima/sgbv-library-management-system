import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../src/app";
import { signAccessToken } from "../../src/utils/jwt";

const CSRF = "csrf-token-for-tests";

function adminToken(id: string): string {
  return signAccessToken({ id, role: "ADMIN", email: `${id}@example.com` });
}

function remaining(header: string | undefined): number {
  return Number(/remaining=(\d+)/.exec(header ?? "")?.[1]);
}

// An empty body fails validation before touching the database, but still passes through the rate limiter.
function updateBookAs(userId: string) {
  return request(app)
    .put("/api/v1/books/some-id")
    .set("Authorization", `Bearer ${adminToken(userId)}`)
    .set("Cookie", `sgb_csrf=${CSRF}`)
    .set("X-CSRF-Token", CSRF)
    .send({});
}

describe("sensitive operation rate limit", () => {
  it("counts each authenticated user separately", async () => {
    for (let i = 0; i < 3; i++) {
      await updateBookAs("admin-a");
    }

    const firstRequestOfOtherUser = await updateBookAs("admin-b");

    expect(firstRequestOfOtherUser.status).toBe(400);
    expect(remaining(firstRequestOfOtherUser.headers["ratelimit"])).toBe(19);
  });
});
