export const MS_PER_MINUTE = 60 * 1000;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

// Circulation rules
export const MAX_ACTIVE_LOANS = 5;
export const LOAN_DAYS = 7;
export const FINE_PER_DAY = 2;
export const RESERVATION_EXPIRATION_HOURS = 48;

// Credentials
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 255;
export const BCRYPT_SALT_ROUNDS = 10;
export const ACCESS_COOKIE_MAX_AGE_MS = 15 * MS_PER_MINUTE;

// HTTP hardening
export const MAX_REQUEST_BODY_BYTES = 1024 * 1024;
export const HSTS_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
export const CORS_PREFLIGHT_MAX_AGE_SECONDS = 24 * 60 * 60;

export const RATE_LIMITS = {
  login: { windowMs: 15 * MS_PER_MINUTE, limit: 10 },
  userCreation: { windowMs: MS_PER_HOUR, limit: 5 },
  refreshToken: { windowMs: MS_PER_HOUR, limit: 30 },
  generalWrite: { windowMs: 15 * MS_PER_MINUTE, limit: 100 },
  sensitiveOperation: { windowMs: MS_PER_HOUR, limit: 20 }
} as const;

// Security monitoring: warn when one client keeps hitting the same rejected endpoint
export const SUSPICIOUS_STATUS_CODES: readonly number[] = [401, 403, 429];
export const SUSPICIOUS_WINDOW_MS = 10 * MS_PER_MINUTE;
export const SUSPICIOUS_ALERT_THRESHOLD = 20;
