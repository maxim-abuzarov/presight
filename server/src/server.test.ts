import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('./index.ts', import.meta.url));

let blocker: Server;
let port: number;

before(async () => {
  blocker = createServer().listen(0);
  await new Promise((resolve) => blocker.once('listening', resolve));
  port = (blocker.address() as AddressInfo).port;
});

after(async () => {
  await new Promise((resolve) => blocker.close(resolve));
});

describe('server start-up', () => {
  it('exits with code 1 and never claims to be listening when the port is taken', async () => {
    const child = spawn(process.execPath, ['--import', 'tsx', entry], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(port),
        DB_PATH: ':memory:',
        LOG_LEVEL: 'info',
      },
    });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    const code = await new Promise<number | null>((resolve) => child.on('exit', resolve));

    assert.equal(code, 1);
    assert.match(output, /EADDRINUSE/);
    assert.doesNotMatch(output, /API listening/);
  });
});

function startServer(env: Record<string, string>): { child: ChildProcess; output: () => string } {
  const child = spawn(process.execPath, ['--import', 'tsx', entry], {
    env: { ...process.env, NODE_ENV: 'production', PORT: '0', LOG_LEVEL: 'info', ...env },
  });
  let output = '';
  child.stdout?.on('data', (chunk) => (output += chunk));
  child.stderr?.on('data', (chunk) => (output += chunk));
  return { child, output: () => output };
}

async function waitFor(read: () => string, pattern: RegExp): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (!pattern.test(read())) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${pattern}:\n${read()}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function stop(child: ChildProcess): Promise<number | null> {
  const exited = new Promise<number | null>((resolve) => child.on('exit', resolve));
  child.kill('SIGTERM');
  return exited;
}

describe('database preparation on start-up', () => {
  it('seeds an empty database, keeps it on the next start, and shuts down cleanly', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'start-up-'));
    const dbPath = path.join(dir, 'app.db');
    const env = { DB_PATH: dbPath, SEED_USER_COUNT: '50' };

    const first = startServer(env);
    await waitFor(first.output, /API listening/);
    assert.match(first.output(), /Seeded database/);
    assert.equal(await stop(first.child), 0);
    assert.match(first.output(), /Shutdown complete/);

    const db = new DatabaseSync(dbPath);
    db.exec("UPDATE users SET first_name = 'Kept' WHERE id = 1");
    db.close();

    const second = startServer(env);
    await waitFor(second.output, /API listening/);
    assert.match(second.output(), /Database already seeded; skipping/);
    assert.doesNotMatch(second.output(), /Seeded database/);
    assert.equal(await stop(second.child), 0);

    const check = new DatabaseSync(dbPath, { readOnly: true });
    const row = check.prepare('SELECT first_name FROM users WHERE id = 1').get() as {
      first_name: string;
    };
    check.close();
    assert.equal(row.first_name, 'Kept');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('re-seeds on every start when SEED_ON_START=always', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'start-up-'));
    const env = {
      DB_PATH: path.join(dir, 'app.db'),
      SEED_USER_COUNT: '20',
      SEED_ON_START: 'always',
    };

    for (let run = 0; run < 2; run += 1) {
      const server = startServer(env);
      await waitFor(server.output, /API listening/);
      assert.match(server.output(), /Seeded database/);
      assert.equal(await stop(server.child), 0);
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
