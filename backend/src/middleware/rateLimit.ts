import type { Request, Response, NextFunction } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function createRateLimitMiddleware(options: RateLimitOptions) {
  const entries = new Map<string, RateLimitEntry>();
  const getKey =
    options.keyGenerator ||
    ((req: Request): string => {
      const forwarded = req.headers["x-forwarded-for"];
      if (typeof forwarded === "string" && forwarded.length > 0) {
        return forwarded.split(",")[0].trim();
      }

      return req.ip || "unknown";
    });

  const cleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [key, value] of entries) {
        if (value.resetAt <= now) {
          entries.delete(key);
        }
      }
    },
    Math.max(options.windowMs, 30_000),
  );

  // Do not keep the process alive only for periodic map cleanup.
  cleanupInterval.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = getKey(req);
    const now = Date.now();
    const existing = entries.get(key);

    if (!existing || existing.resetAt <= now) {
      entries.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    existing.count += 1;

    if (existing.count > options.max) {
      const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(Math.max(retryAfterSeconds, 1)));
      res.status(429).json({ message: options.message });
      return;
    }

    next();
  };
}
