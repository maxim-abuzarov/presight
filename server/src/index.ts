import { assertSqliteSupport } from './preflight.js';

assertSqliteSupport();

const task = process.argv[2];

switch (task) {
  case 'seed': {
    const { runSeed } = await import('./db/seed.js');
    runSeed();
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
    console.error(`Unknown task "${task}". Expected one of: serve, seed, migrate.`);
    process.exit(1);
  }
}
