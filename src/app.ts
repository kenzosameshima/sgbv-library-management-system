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

const app = express();

// Preparar CSP connect-src com origem configurada
const cspConnectSrc = ["'self'", ...env.corsAllowedOrigins];

// Security headers com CSP configurado
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
      maxAge: 31536000, // 1 ano em produção
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
  })
);

// Permissions-Policy header (Permissions-Policy para evitar abuso de features)
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

      callback(new Error("Origem nao permitida pelo CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    credentials: true,
    maxAge: 86400 // 24h cache de preflight
  })
);

// Validación de tamaño de payload (máx 1MB)
app.use(validatePayloadSize(1024 * 1024));

// JSON parsing com tamanho máximo
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(requireCsrf);
app.use(securityMonitoring);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/v1", apiRoutes);

// Handler de erro seguro DEVE ser o último middleware
app.use(secureErrorHandler);

export default app;
