import bcrypt from "bcrypt";
import { Request, Response, NextFunction } from "express";
import { HttpError } from "../utils/httpError";
import { findUserByEmail } from "../repositories/userRepository";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import {
  deleteExpiredRefreshTokens,
  findRefreshTokenOwner,
  revokeRefreshToken,
  saveRefreshToken
} from "../repositories/tokenRepository";
import { env } from "../config/env";
import { loginSchema, refreshSchema } from "../schemas/auth";
import { clearCsrfCookie, issueCsrfCookie } from "../middlewares/csrf";
import { ACCESS_COOKIE_MAX_AGE_MS, MS_PER_DAY } from "../utils/constants";

function authCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "strict" as const,
    domain: env.authCookieDomain,
    path: "/",
    maxAge: maxAgeMs
  };
}

const refreshTokenTtlMs = env.jwtRefreshExpiresInDays * MS_PER_DAY;

function readRefreshToken(req: Request): string | undefined {
  const fromBody: unknown = req.body?.refreshToken;
  if (typeof fromBody === "string") {
    return fromBody;
  }

  const fromCookie: unknown = req.cookies?.[env.refreshCookieName];
  return typeof fromCookie === "string" ? fromCookie : undefined;
}

function setSessionCookies(res: Response, accessToken: string, refreshToken: string): string {
  res.cookie(env.accessCookieName, accessToken, authCookieOptions(ACCESS_COOKIE_MAX_AGE_MS));
  res.cookie(env.refreshCookieName, refreshToken, authCookieOptions(refreshTokenTtlMs));

  return issueCsrfCookie(res);
}

function clearSessionCookies(res: Response): void {
  const clearOptions = authCookieOptions(0);
  res.clearCookie(env.accessCookieName, clearOptions);
  res.clearCookie(env.refreshCookieName, clearOptions);
  clearCsrfCookie(res);
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteExpiredRefreshTokens();
    const { email, password } = loginSchema.parse(req.body);
    const user = await findUserByEmail(email);

    if (!user) {
      throw new HttpError(401, "Invalid credentials");
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      throw new HttpError(401, "Invalid credentials");
    }

    const payload = {
      id: user.id,
      role: user.role,
      email: user.email
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const refreshExpiresAt = new Date(Date.now() + refreshTokenTtlMs);
    await saveRefreshToken({ userId: user.id, token: refreshToken, expiresAt: refreshExpiresAt });

    const csrfToken = setSessionCookies(res, accessToken, refreshToken);

    res.status(200).json({
      csrfToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = readRefreshToken(req);
    if (!refreshToken) {
      throw new HttpError(401, "Invalid or expired refresh token");
    }

    refreshSchema.parse({ refreshToken });

    const ownerId = await findRefreshTokenOwner(refreshToken);
    if (!ownerId) {
      throw new HttpError(401, "Invalid or expired refresh token");
    }

    const payload = verifyRefreshToken(refreshToken);
    if (payload.id !== ownerId) {
      throw new HttpError(401, "Invalid refresh token");
    }

    await revokeRefreshToken(refreshToken);

    const accessToken = signAccessToken(payload);
    const nextRefreshToken = signRefreshToken(payload);
    const refreshExpiresAt = new Date(Date.now() + refreshTokenTtlMs);
    await saveRefreshToken({ userId: payload.id, token: nextRefreshToken, expiresAt: refreshExpiresAt });

    const csrfToken = setSessionCookies(res, accessToken, nextRefreshToken);

    res.status(200).json({ csrfToken });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = readRefreshToken(req);
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    clearSessionCookies(res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new HttpError(401, "Not authenticated");
    }

    res.status(200).json({ user: req.user });
  } catch (error) {
    next(error);
  }
}
