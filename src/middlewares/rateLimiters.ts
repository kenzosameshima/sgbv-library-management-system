import rateLimit from "express-rate-limit";
import { RATE_LIMITS } from "../utils/constants";

const RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED";

// Keyed by user id once authenticated, otherwise by IP.
const keyByUserOrIp = (req: { user?: { id: string }; ip?: string }): string => req.user?.id || req.ip || "unknown";

/** Login attempts, per IP. */
export const loginRateLimiter = rateLimit({
  ...RATE_LIMITS.login,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many login attempts. Try again in a few minutes.", code: RATE_LIMIT_EXCEEDED },
  // Outside production, X-Bypass-Rate-Limit: true skips the limit.
  skip: (req) => process.env.NODE_ENV !== "production" && req.headers["x-bypass-rate-limit"] === "true"
});

/** User registrations, per IP. */
export const userCreationRateLimiter = rateLimit({
  ...RATE_LIMITS.userCreation,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many registration attempts. Try again later.", code: RATE_LIMIT_EXCEEDED }
});

/** Token refreshes, per IP (protects against token stuffing). */
export const refreshTokenRateLimiter = rateLimit({
  ...RATE_LIMITS.refreshToken,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many refresh attempts. Try again later.", code: RATE_LIMIT_EXCEEDED }
});

/** Write operations, per authenticated user. */
export const generalWriteRateLimiter = rateLimit({
  ...RATE_LIMITS.generalWrite,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests. Try again later.", code: RATE_LIMIT_EXCEEDED },
  keyGenerator: keyByUserOrIp
});

/** Sensitive operations (update, delete), per authenticated user. */
export const sensitiveOperationRateLimiter = rateLimit({
  ...RATE_LIMITS.sensitiveOperation,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many sensitive operations. Try again later.", code: RATE_LIMIT_EXCEEDED },
  keyGenerator: keyByUserOrIp
});
