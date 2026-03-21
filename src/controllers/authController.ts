import bcrypt from "bcrypt";
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { HttpError } from "../utils/httpError";
import { createEmailSchema, createStringSchema } from "../utils/validation";
import { findUserByEmail } from "../repositories/userRepository";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import {
  deleteExpiredRefreshTokens,
  findRefreshTokenOwner,
  revokeRefreshToken,
  saveRefreshToken
} from "../repositories/tokenRepository";
import { env } from "../config/env";
import { clearCsrfCookie, issueCsrfCookie } from "../middlewares/csrf";

const loginSchema = z.object({
  email: createEmailSchema(),
  password: createStringSchema(8, 255, "Senha")
}).strict();

const refreshSchema = z.object({
  refreshToken: createStringSchema(1, 1000, "Token de refresh")
}).strict();

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

function setSessionCookies(res: Response, accessToken: string, refreshToken: string): string {
  const accessMaxAgeMs = 15 * 60 * 1000;
  const refreshMaxAgeMs = env.jwtRefreshExpiresInDays * 24 * 60 * 60 * 1000;

  res.cookie(env.accessCookieName, accessToken, authCookieOptions(accessMaxAgeMs));
  res.cookie(env.refreshCookieName, refreshToken, authCookieOptions(refreshMaxAgeMs));

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
      throw new HttpError(401, "Credenciais invalidas");
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      throw new HttpError(401, "Credenciais invalidas");
    }

    const payload = {
      id: user.id,
      role: user.role,
      email: user.email
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const refreshExpiresAt = new Date(Date.now() + env.jwtRefreshExpiresInDays * 24 * 60 * 60 * 1000);
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
    const tokenFromBody = req.body?.refreshToken as string | undefined;
    const refreshToken = tokenFromBody ?? (req.cookies?.[env.refreshCookieName] as string | undefined);
    if (!refreshToken) {
      throw new HttpError(401, "Refresh token invalido ou expirado");
    }

    refreshSchema.parse({ refreshToken });

    const ownerId = await findRefreshTokenOwner(refreshToken);
    if (!ownerId) {
      throw new HttpError(401, "Refresh token invalido ou expirado");
    }

    const payload = verifyRefreshToken(refreshToken);
    if (payload.id !== ownerId) {
      throw new HttpError(401, "Refresh token invalido");
    }

    await revokeRefreshToken(refreshToken);

    const accessToken = signAccessToken(payload);
    const nextRefreshToken = signRefreshToken(payload);
    const refreshExpiresAt = new Date(Date.now() + env.jwtRefreshExpiresInDays * 24 * 60 * 60 * 1000);
    await saveRefreshToken({ userId: payload.id, token: nextRefreshToken, expiresAt: refreshExpiresAt });

    const csrfToken = setSessionCookies(res, accessToken, nextRefreshToken);

    res.status(200).json({ csrfToken });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tokenFromBody = req.body?.refreshToken as string | undefined;
    const refreshToken = tokenFromBody ?? (req.cookies?.[env.refreshCookieName] as string | undefined);
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
      throw new HttpError(401, "Nao autenticado");
    }

    res.status(200).json({ user: req.user });
  } catch (error) {
    next(error);
  }
}
