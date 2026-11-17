import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { after, before, describe, it } from 'node:test';

process.env.RATE_LIMIT_PER_MINUTE = '3';

let server: Server;
let origin: string;
let closeDb: () => void;

before(async () => {
  const connection = await import('../db/connection.js');
  const { seed } = await import('../db/seed.js');
  const { createApp } = await import('../app.js');
  connection.useDatabase(':memory:');
  seed(20);
  closeDb = connection.closeDb;
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  closeDb();
});

describe('rate limiting', () => {
  it('answers 429 with a JSON message once a client exceeds the limit', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      statuses.push((await fetch(`${origin}/api/users?pageSize=1`)).status);
    }
    assert.deepEqual(statuses, [200, 200, 200, 429]);

    const limited = await fetch(`${origin}/api/facets`);
    assert.equal(limited.status, 429);
    assert.match(((await limited.json()) as { error: string }).error, /Too many requests/);
    assert.ok(limited.headers.get('ratelimit'), 'standard RateLimit header is sent');
  });

  it('never limits the health check or avatars', async () => {
    assert.equal((await fetch(`${origin}/api/health`)).status, 200);
    for (let i = 0; i < 5; i += 1) {
      assert.equal((await fetch(`${origin}/api/avatars/u${i}.svg`)).status, 200);
    }
  });

  it('ignores a spoofed X-Forwarded-For when no proxy is trusted', async () => {
    const response = await fetch(`${origin}/api/users?pageSize=1`, {
      headers: { 'x-forwarded-for': '203.0.113.9' },
    });
    assert.equal(response.status, 429, 'a fake client IP must not reset the counter');
  });
});
