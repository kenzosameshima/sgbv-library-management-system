import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError";
import { logger } from "../config/logger";

/**
 * Standardised error response body
 */
interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  timestamp: string;
}

/**
 * Public-safe messages for internal error names
 */
const ERROR_MESSAGES: Record<string, string> = {
  ECONNREFUSED: "Service temporarily unavailable",
  ENOTFOUND: "Resource not found",
  ETIMEDOUT: "Operation timed out. Try again",
  default: "Internal server error"
};

/**
 * Central error handler with a standard response shape.
 * Never exposes stack traces or internal details to the client.
 */
export function secureErrorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  const timestamp = new Date().toISOString();

  // Zod validation errors
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};

    err.issues.forEach((issue) => {
      const path = issue.path.join(".");
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(issue.message);
    });

    const response: ErrorResponse = {
      code: "VALIDATION_ERROR",
      message: "Invalid input data",
      details,
      timestamp
    };

    res.status(400).json(response);
    return;
  }

  // Known HTTP errors
  if (err instanceof HttpError) {
    const response: ErrorResponse = {
      code: err.code || "HTTP_ERROR",
      message: err.message,
      timestamp
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Anything else: do not leak internals
  const response: ErrorResponse = {
    code: "INTERNAL_ERROR",
    message: ERROR_MESSAGES[err.name] || ERROR_MESSAGES.default,
    timestamp
  };

  // Logged server-side only; stack traces are kept out of production logs
  logger.error(
    {
      path: _req.path,
      method: _req.method,
      err: process.env.NODE_ENV === "production" ? { name: err.name, type: err.constructor.name } : err
    },
    "Unhandled error"
  );

  res.status(500).json(response);
}
