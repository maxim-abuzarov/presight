import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

import { config } from '../config.js';

const passThrough: RequestHandler = (_req, _res, next) => next();

export const apiRateLimit: RequestHandler =
  config.rateLimitPerMinute > 0
    ? rateLimit({
        windowMs: 60_000,
        limit: config.rateLimitPerMinute,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: 'Too many requests. Please wait a moment and try again.' },
      })
    : passThrough;
