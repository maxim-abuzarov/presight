import { createApp } from './app.js';
import { config } from './config.js';
import { closeDb } from './db/connection.js';
import { migrate } from './db/migrate.js';

export function start(): void {
  migrate();

  const server = createApp().listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port} (db: ${config.dbPath})`);
  });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      server.close(() => {
        closeDb();
        process.exit(0);
      });
    });
  }
}
