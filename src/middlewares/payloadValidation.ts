import { Request, Response, NextFunction } from "express";

/** Rejects requests whose declared Content-Length exceeds `maxSize` bytes (denial-of-service guard). */
export function validatePayloadSize(maxSize: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);

    if (contentLength > maxSize) {
      res.status(413).json({ message: `Payload must not exceed ${maxSize / 1024}KB` });
      return;
    }

    next();
  };
}
