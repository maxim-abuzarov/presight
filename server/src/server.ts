import { createApp } from './app.js';
import { config } from './config.js';
import { closeDb } from './db/connection.js';
import { migrate } from './db/migrate.js';
import { logger } from './shared/logger.js';

export function start(): void {
  // Schema first, port second: the process must not accept traffic it cannot serve.
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

  // Slow or stalled clients must not hold sockets forever. keepAliveTimeout is longer than the
  // usual 60s idle timeout of load balancers, so the proxy closes idle connections first and
  // never sends a request into a socket Node is closing (a classic source of random 502s).
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

    // A hung keep-alive connection must not keep the container alive past the orchestrator's
    // grace period (docker stop waits 10s, then SIGKILLs).
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

  // An unexpected exception leaves the process in an unknown state: log it, then let the
  // container restart policy start a clean one rather than limping on.
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled promise rejection');
    process.exit(1);
  });
}
