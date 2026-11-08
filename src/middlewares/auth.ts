import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { HttpError } from "../utils/httpError";
import { Role } from "../models/types";
import { env } from "../config/env";

function extractAccessToken(req: Request): string | null {
  const tokenFromCookie: unknown = req.cookies?.[env.accessCookieName];
  if (typeof tokenFromCookie === "string" && tokenFromCookie) {
    return tokenFromCookie;
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractAccessToken(req);
  if (!token) {
    next(new HttpError(401, "Missing or invalid token"));
    return;
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token"));
  }
}

export function authenticateOptional(req: Request, _res: Response, next: NextFunction): void {
  const token = extractAccessToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    req.user = verifyAccessToken(token);
  } catch {
    // An invalid token is ignored in optional mode; handlers enforce permissions where needed.
  }

  next();
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new HttpError(401, "Not authenticated"));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new HttpError(403, "You do not have permission for this action"));
      return;
    }

    next();
  };
}
