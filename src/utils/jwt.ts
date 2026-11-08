import crypto from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { Role } from "../models/types";

const jwtPayloadSchema = z.object({
  id: z.string(),
  role: z.enum(["USER", "ADMIN"]),
  email: z.string()
});

type JwtPayload = z.infer<typeof jwtPayloadSchema> & { role: Role };

/** Narrow a verified token body to the identity claims we sign, rejecting any other shape. */
function toIdentity(decoded: string | jwt.JwtPayload): JwtPayload {
  const parsed = jwtPayloadSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new jwt.JsonWebTokenError("Unexpected token payload");
  }
  return parsed.data;
}

// Only identity claims are signed: a verified token also carries iat/exp, which jwt.sign rejects alongside expiresIn.
function identityClaims({ id, role, email }: JwtPayload): JwtPayload {
  return { id, role, email };
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(identityClaims(payload), env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn as jwt.SignOptions["expiresIn"]
  });
}

export function signRefreshToken(payload: JwtPayload): string {
  // A unique jti keeps two refresh tokens issued in the same second distinct, so rotation always invalidates the old one.
  return jwt.sign(identityClaims(payload), env.jwtRefreshSecret, {
    jwtid: crypto.randomUUID(),
    expiresIn: env.jwtRefreshExpiresIn as jwt.SignOptions["expiresIn"]
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return toIdentity(jwt.verify(token, env.jwtAccessSecret));
}

export function verifyRefreshToken(token: string): JwtPayload {
  return toIdentity(jwt.verify(token, env.jwtRefreshSecret));
}
