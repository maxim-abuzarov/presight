import { Router } from 'express';

import { getDb } from '../db/connection.js';
import { schemaVersion } from '../db/migrate.js';
import { logger } from '../shared/logger.js';

export const healthRouter: Router = Router();

healthRouter.get('/health', (_req, res) => {
  try {
    const { users } = getDb().prepare('SELECT COUNT(*) AS users FROM users').get() as {
      users: number;
    };
    res.set('cache-control', 'no-store').json({
      status: 'ok',
      db: { status: 'ok', schemaVersion: schemaVersion(), users },
      uptimeSeconds: Math.round(process.uptime()),
    });
  } catch (error) {
    logger.error({ err: error }, 'Health check failed');
    res
      .status(503)
      .set('cache-control', 'no-store')
      .json({ status: 'error', db: { status: 'error' } });
  }
});
