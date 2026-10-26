import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { Role } from "../models/types";

interface JwtPayload {
  id: string;
  role: Role;
  email: string;
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
  return jwt.sign(identityClaims(payload), env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn as jwt.SignOptions["expiresIn"]
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtAccessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as JwtPayload;
}
