import fs from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { avatarsRouter } from './avatars/avatars.routes.js';
import { config } from './config.js';
import { healthRouter } from './health/health.routes.js';
import { errorHandler, notFoundHandler } from './shared/error-middleware.js';
import { requestLogger } from './shared/request-logger.js';
import { usersRouter } from './users/users.routes.js';

/**
 * Builds the Express app without listening, so the same object is served by `node dist/index.js`,
 * by the Vercel function and by the HTTP tests.
 *
 * Middleware order is the request's path through the app:
 *   security headers → request id + access log → compression → API routes (data routes are
 *   rate-limited) →
 *   API 404 → static client → SPA fallback → 404 → error handler (always last: Express
 *   recognises it by its four arguments).
 */
export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  // Only trust X-Forwarded-For when a known number of proxies is in front (see TRUST_PROXY);
  // otherwise req.ip is the real socket address and cannot be spoofed with a header.
  app.set('trust proxy', config.trustProxy);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          fontSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          // helmet adds upgrade-insecure-requests by default; on plain http://localhost it would
          // make Safari rewrite asset URLs to https and fail.
          upgradeInsecureRequests: null,
        },
      },
    }),
  );
  app.use(requestLogger);
  // gzip/brotli for JSON and static files: a 50-user page shrinks from ~15KB to ~3KB.
  app.use(compression());

  // The client is served from this same origin (Vite proxies /api in development), so no CORS
  // headers are sent: no other origin is meant to call this API from a browser.
  app.use('/api', healthRouter);
  app.use('/api', usersRouter);
  app.use('/api', avatarsRouter);
  app.use('/api', notFoundHandler);

  const indexHtml = path.join(config.clientDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    // Vite fingerprints everything under /assets (index-3f9a1c.js), so those files never change
    // and can be cached for a year; index.html is not fingerprinted and must always revalidate.
    app.use(
      '/assets',
      express.static(path.join(config.clientDist, 'assets'), { immutable: true, maxAge: '1y' }),
    );
    app.use(express.static(config.clientDist, { index: false, maxAge: '1h' }));

    // Client-side routes (deep links) get the app shell; unknown /api paths never reach here.
    app.get('/{*splat}', (_req, res) => {
      res.set('cache-control', 'no-cache').sendFile(indexHtml);
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
