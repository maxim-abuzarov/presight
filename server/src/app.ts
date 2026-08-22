import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express, { type Express } from 'express';

import { config } from './config.js';
import { errorHandler, notFoundHandler } from './shared/error-middleware.js';
import { apiRouter } from './users/users.routes.js';

export function createApp(): Express {
  const app = express();
  if (!config.isProduction) {
    app.use(cors());
  }

  app.use('/api', apiRouter);

  app.use('/api', notFoundHandler);

  const indexHtml = path.join(config.clientDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(config.clientDist));

    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      res.sendFile(indexHtml);
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
