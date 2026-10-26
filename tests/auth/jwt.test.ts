import { describe, expect, it } from "vitest";
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from "../../src/utils/jwt";

const identity = { id: "11111111-1111-4111-8111-111111111111", role: "USER" as const, email: "reader@example.com" };

describe("token rotation", () => {
  it("issues a fresh token pair from a verified refresh token", () => {
    const verified = verifyRefreshToken(signRefreshToken(identity));

    const accessToken = signAccessToken(verified);
    const nextRefreshToken = signRefreshToken(verified);

    expect(verifyAccessToken(accessToken)).toMatchObject(identity);
    expect(verifyRefreshToken(nextRefreshToken)).toMatchObject(identity);
  });
});
