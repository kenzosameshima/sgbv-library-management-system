import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import apiRoutes from "./routes";
import { secureErrorHandler } from "./middlewares/secureErrorHandler";
import { validatePayloadSize } from "./middlewares/payloadValidation";
import { requireCsrf } from "./middlewares/csrf";
import { securityMonitoring } from "./middlewares/securityMonitoring";
import { env } from "./config/env";
import { CORS_PREFLIGHT_MAX_AGE_SECONDS, HSTS_MAX_AGE_SECONDS, MAX_REQUEST_BODY_BYTES } from "./utils/constants";

const app = express();

// CSP connect-src allows the configured CORS origins
const cspConnectSrc = ["'self'", ...env.corsAllowedOrigins];

// Security headers with CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'"],
        connectSrc: cspConnectSrc,
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    hsts: {
      maxAge: HSTS_MAX_AGE_SECONDS,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
  })
);

// Permissions-Policy: disable browser features the app does not use
app.use((_req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
  );
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (env.corsAllowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    credentials: true,
    maxAge: CORS_PREFLIGHT_MAX_AGE_SECONDS
  })
);

// Reject oversized payloads early
app.use(validatePayloadSize(MAX_REQUEST_BODY_BYTES));

// JSON parsing with the same size cap
app.use(express.json({ limit: MAX_REQUEST_BODY_BYTES }));
app.use(cookieParser());
app.use(requireCsrf);
app.use(securityMonitoring);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/v1", apiRoutes);

// The error handler must be the last middleware
app.use(secureErrorHandler);

export default app;
