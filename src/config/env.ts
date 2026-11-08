import dotenv from "dotenv";

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const DEFAULT_PORT = 3000;
const DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://localhost:5174";
const DEFAULT_ACCESS_TOKEN_TTL = "15m";
const DEFAULT_REFRESH_TOKEN_TTL = "7d";
const DEFAULT_REFRESH_TOKEN_DAYS = 7;

export const env = {
  port: Number(process.env.PORT ?? DEFAULT_PORT),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: requireEnv("DATABASE_URL"),
  databaseSsl: (process.env.DATABASE_SSL ?? "false").toLowerCase() === "true",
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? DEFAULT_CORS_ORIGINS)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  accessCookieName: process.env.AUTH_ACCESS_COOKIE_NAME ?? "sgb_at",
  refreshCookieName: process.env.AUTH_REFRESH_COOKIE_NAME ?? "sgb_rt",
  csrfCookieName: process.env.AUTH_CSRF_COOKIE_NAME ?? "sgb_csrf",
  authCookieDomain: process.env.AUTH_COOKIE_DOMAIN ?? undefined,
  jwtAccessSecret: requireEnv("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: requireEnv("JWT_REFRESH_SECRET"),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? DEFAULT_ACCESS_TOKEN_TTL,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? DEFAULT_REFRESH_TOKEN_TTL,
  jwtRefreshExpiresInDays: Number(process.env.JWT_REFRESH_EXPIRES_IN_DAYS ?? DEFAULT_REFRESH_TOKEN_DAYS)
};
