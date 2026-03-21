import { query } from "../config/db";
import crypto from "crypto";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function saveRefreshToken(data: { userId: string; token: string; expiresAt: Date }): Promise<void> {
  const tokenHash = hashToken(data.token);
  await query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [data.userId, tokenHash, data.expiresAt]
  );
}

export async function findRefreshTokenOwner(token: string): Promise<string | null> {
  const tokenHash = hashToken(token);
  const rows = await query<{ user_id: string }>(
    "SELECT user_id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW() LIMIT 1",
    [tokenHash]
  );

  return rows[0]?.user_id ?? null;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await query("DELETE FROM refresh_tokens WHERE token = $1", [tokenHash]);
}

export async function deleteExpiredRefreshTokens(): Promise<void> {
  await query("DELETE FROM refresh_tokens WHERE expires_at <= NOW()");
}

export async function hasRefreshToken(token: string): Promise<boolean> {
  const tokenHash = hashToken(token);
  const rows = await query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()",
    [tokenHash]
  );

  return Number(rows[0]?.count ?? 0) > 0;
}
