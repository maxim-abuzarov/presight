import { Router } from 'express';

import { getDb } from '../db/connection.js';
import { schemaVersion } from '../db/migrate.js';
import { logger } from '../shared/logger.js';

export const healthRouter: Router = Router();

/**
 * Readiness, not just liveness: it answers 200 only when the process can actually serve data —
 * the database opens, the schema is applied and a real query succeeds. Docker's HEALTHCHECK,
 * the e2e suite and the dev script all wait on this endpoint, so "healthy" means "safe to send
 * traffic", and a missing or broken database shows up as 503 here rather than as failed API
 * calls in the browser.
 */
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
