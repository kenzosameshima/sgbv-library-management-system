import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { HttpError } from "../utils/httpError";
import { Role } from "../models/types";
import { env } from "../config/env";

function extractAccessToken(req: Request): string | null {
  const tokenFromCookie = req.cookies?.[env.accessCookieName] as string | undefined;
  if (tokenFromCookie) {
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
    next(new HttpError(401, "Token ausente ou invalido"));
    return;
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new HttpError(401, "Token invalido ou expirado"));
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
    // Ignore invalid token in optional auth mode; createUser will enforce permissions when needed.
  }

  next();
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new HttpError(401, "Nao autenticado"));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new HttpError(403, "Sem permissao para esta acao"));
      return;
    }

    next();
  };
}
