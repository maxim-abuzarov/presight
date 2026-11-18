import { assertSqliteSupport } from './preflight.js';

assertSqliteSupport();

const task = process.argv[2];

switch (task) {
  case 'seed': {
    const { runSeed } = await import('./db/seed.js');
    runSeed();
    break;
  }
  case 'seal': {
    const { runSeal } = await import('./db/seal.js');
    runSeal();
    break;
  }
  case 'migrate': {
    const { runMigrate } = await import('./db/migrate.js');
    runMigrate();
    break;
  }
  case undefined:
  case 'serve': {
    const { start } = await import('./server.js');
    start();
    break;
  }
  default: {
    const { logger } = await import('./shared/logger.js');
    logger.fatal({ task }, 'Unknown task. Expected one of: serve, seed, seal, migrate.');
    process.exit(1);
  }
}
