import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError";
import { env } from "../config/env";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function csrfCookieOptions() {
  return {
    httpOnly: false,
    secure: env.nodeEnv === "production",
    sameSite: "strict" as const,
    domain: env.authCookieDomain,
    path: "/"
  };
}

export function issueCsrfCookie(res: Response): string {
  const token = crypto.randomBytes(32).toString("hex");
  res.cookie(env.csrfCookieName, token, csrfCookieOptions());
  return token;
}

export function clearCsrfCookie(res: Response): void {
  res.clearCookie(env.csrfCookieName, csrfCookieOptions());
}

export function requireCsrf(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  if (req.path === "/api/v1/auth/login") {
    next();
    return;
  }

  const cookieToken = req.cookies?.[env.csrfCookieName] as string | undefined;
  const headerToken = req.header("x-csrf-token") ?? req.header("X-CSRF-Token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    next(new HttpError(403, "CSRF token invalido", "CSRF_INVALID"));
    return;
  }

  next();
}
