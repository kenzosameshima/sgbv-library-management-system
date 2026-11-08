import { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger";
import { MS_PER_MINUTE, SUSPICIOUS_ALERT_THRESHOLD, SUSPICIOUS_STATUS_CODES, SUSPICIOUS_WINDOW_MS } from "../utils/constants";

interface CounterBucket {
  count: number;
  firstSeenAt: number;
}

const suspiciousBuckets = new Map<string, CounterBucket>();

function cleanupExpired(now: number): void {
  for (const [key, bucket] of suspiciousBuckets.entries()) {
    if (now - bucket.firstSeenAt > SUSPICIOUS_WINDOW_MS) {
      suspiciousBuckets.delete(key);
    }
  }
}

export function securityMonitoring(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();

  res.on("finish", () => {
    const now = Date.now();
    cleanupExpired(now);

    if (!SUSPICIOUS_STATUS_CODES.includes(res.statusCode)) {
      return;
    }

    const ip = req.ip || "unknown-ip";
    const key = `${ip}:${req.path}:${res.statusCode}`;
    const bucket = suspiciousBuckets.get(key);

    if (!bucket) {
      suspiciousBuckets.set(key, { count: 1, firstSeenAt: now });
      return;
    }

    bucket.count += 1;
    suspiciousBuckets.set(key, bucket);

    if (bucket.count === SUSPICIOUS_ALERT_THRESHOLD) {
      logger.warn(
        {
          ip,
          path: req.path,
          statusCode: res.statusCode,
          count: bucket.count,
          windowMinutes: SUSPICIOUS_WINDOW_MS / MS_PER_MINUTE,
          latencyMs: now - startedAt
        },
        "Suspicious request pattern"
      );
    }
  });

  next();
}
