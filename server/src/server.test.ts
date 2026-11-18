import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
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
