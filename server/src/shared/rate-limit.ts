import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

import { config } from '../config.js';

const passThrough: RequestHandler = (_req, _res, next) => next();

/**
 * Per-IP limit on the data endpoints (/api/users, /api/facets). The facet query is the most
 * expensive thing the API does (~10ms of blocking work); without a limit, one client looping
 * on it could starve everyone else. 600/min is far above what a person scrolling and typing
 * produces (debounced input, 50 rows per page).
 *
 * Health and avatars are not limited: probes must always answer, and avatars are cached for a
 * year by the browser anyway.
 *
 * The counter lives in this process's memory. That is correct for one container; with several
 * replicas (or serverless instances) each keeps its own count, and a shared store such as Redis
 * — or a limit at the reverse proxy — would be the next step.
 */
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
