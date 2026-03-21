import { NextFunction, Request, Response } from "express";

interface CounterBucket {
  count: number;
  firstSeenAt: number;
}

const suspiciousBuckets = new Map<string, CounterBucket>();
const WINDOW_MS = 10 * 60 * 1000;

function cleanupExpired(now: number): void {
  for (const [key, bucket] of suspiciousBuckets.entries()) {
    if (now - bucket.firstSeenAt > WINDOW_MS) {
      suspiciousBuckets.delete(key);
    }
  }
}

export function securityMonitoring(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();

  res.on("finish", () => {
    const now = Date.now();
    cleanupExpired(now);

    if (![401, 403, 429].includes(res.statusCode)) {
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

    if (bucket.count === 20) {
      console.warn("[security-monitor] suspicious request pattern", {
        ip,
        path: req.path,
        statusCode: res.statusCode,
        count: bucket.count,
        windowMinutes: WINDOW_MS / 60000,
        latencyMs: now - startedAt
      });
    }
  });

  next();
}
