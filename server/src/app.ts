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

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
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
          upgradeInsecureRequests: null,
        },
      },
    }),
  );
  app.use(requestLogger);
  app.use(compression());

  app.use('/api', healthRouter);
  app.use('/api', usersRouter);
  app.use('/api', avatarsRouter);
  app.use('/api', notFoundHandler);

  const indexHtml = path.join(config.clientDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(
      '/assets',
      express.static(path.join(config.clientDist, 'assets'), { immutable: true, maxAge: '1y' }),
    );
    app.use(express.static(config.clientDist, { index: false, maxAge: '1h' }));

    app.get('/{*splat}', (_req, res) => {
      res.set('cache-control', 'no-cache').sendFile(indexHtml);
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
