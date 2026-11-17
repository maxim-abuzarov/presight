import { createApp } from './app.js';
import { config } from './config.js';
import { closeDb } from './db/connection.js';
import { migrate } from './db/migrate.js';
import { logger } from './shared/logger.js';

export function start(): void {
  migrate();

  const app = createApp();
  const onListening = () => {
    logger.info(
      { port: config.port, dbPath: config.dbPath, readOnly: config.dbReadOnly },
      `API listening on http://localhost:${config.port}`,
    );
  };
  const server = config.host
    ? app.listen(config.port, config.host, onListening)
    : app.listen(config.port, onListening);

  server.requestTimeout = 30_000;
  server.headersTimeout = 31_000;
  server.keepAliveTimeout = 65_000;

  server.on('error', (error) => {
    logger.fatal({ err: error }, 'HTTP server failed to start');
    process.exit(1);
  });

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down: draining in-flight requests');

    const force = setTimeout(() => {
      logger.warn('Shutdown timed out; forcing exit');
      process.exit(1);
    }, config.shutdownTimeoutMs);
    force.unref();

    server.close(() => {
      closeDb();
      logger.info('Shutdown complete');
      process.exit(0);
    });
    server.closeIdleConnections();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled promise rejection');
    process.exit(1);
  });
}
