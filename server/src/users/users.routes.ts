import { Router } from 'express';

import { facetsHandler, usersHandler } from './users.controller.js';

export const apiRouter: Router = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true });
});
apiRouter.get('/users', usersHandler);
apiRouter.get('/facets', facetsHandler);
