import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

/** Fixed-window limiter answering 429 `{ error: 'rate-limited' }`, keyed by the given function. */
export function limiter(windowMs: number, limit: number, key: (req: Request) => string) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: key,
    handler: (_req, res) => {
      res.status(429).json({ error: 'rate-limited' });
    },
  });
}

export const ipKey = (req: Request): string => ipKeyGenerator(req.ip ?? 'unknown');
