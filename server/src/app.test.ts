import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { after, before, describe, it } from 'node:test';

import { createApp } from './app.js';
import { closeDb, useDatabase } from './db/connection.js';
import { LATEST_SCHEMA_VERSION } from './db/schema.js';
import { seed } from './db/seed.js';
import type { FacetsResponse, UsersResponse } from './users/users.types.js';

let server: Server;
let origin: string;

const get = async (path: string): Promise<Response> => fetch(`${origin}${path}`);
const getJson = async <T>(path: string): Promise<T> => {
  const response = await get(path);
  assert.equal(response.status, 200, `${path} should succeed`);
  return response.json() as Promise<T>;
};

before(async () => {
  useDatabase(':memory:');
  seed(300);
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  closeDb();
});

describe('GET /api/health', () => {
  it('reports readiness including the database', async () => {
    const body = await getJson<{
      status: string;
      db: { status: string; users: number; schemaVersion: number };
    }>('/api/health');
    assert.equal(body.status, 'ok');
    assert.equal(body.db.status, 'ok');
    assert.equal(body.db.users, 300);
    assert.equal(body.db.schemaVersion, LATEST_SCHEMA_VERSION);
  });

  it('is never cached, so a probe always sees the live state', async () => {
    assert.equal((await get('/api/health')).headers.get('cache-control'), 'no-store');
  });
});

describe('cross-cutting HTTP concerns', () => {
  it('gives every response a request id for log correlation', async () => {
    const response = await get('/api/users?pageSize=1');
    assert.match(response.headers.get('x-request-id') ?? '', /^[0-9a-f-]{36}$/);
  });

  it('propagates a well-formed upstream request id and replaces a malformed one', async () => {
    const kept = await fetch(`${origin}/api/users?pageSize=1`, {
      headers: { 'x-request-id': 'edge-123' },
    });
    assert.equal(kept.headers.get('x-request-id'), 'edge-123');

    const replaced = await fetch(`${origin}/api/users?pageSize=1`, {
      headers: { 'x-request-id': 'bad id with spaces' },
    });
    assert.notEqual(replaced.headers.get('x-request-id'), 'bad id with spaces');
  });

  it('sends security headers and hides the framework', async () => {
    const response = await get('/api/users?pageSize=1');
    assert.equal(response.headers.get('x-powered-by'), null);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.match(response.headers.get('content-security-policy') ?? '', /default-src 'self'/);
  });

  it('compresses responses when the client accepts it', async () => {
    const response = await fetch(`${origin}/api/users?pageSize=50`, {
      headers: { 'accept-encoding': 'gzip' },
    });
    assert.equal(response.headers.get('content-encoding'), 'gzip');
  });

  it('sends no CORS headers: the API is same-origin only', async () => {
    const response = await fetch(`${origin}/api/users?pageSize=1`, {
      headers: { origin: 'https://evil.example' },
    });
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  });
});

describe('query parsing', () => {
  it('accepts repeated and comma-separated filter values alike', async () => {
    const csv = await getJson<UsersResponse>('/api/users?nationalities=France,Japan&pageSize=1');
    const repeated = await getJson<UsersResponse>(
      '/api/users?nationalities=France&nationalities=Japan&pageSize=1',
    );
    assert.equal(csv.pagination.total, repeated.pagination.total);
  });

  it('applies defaults when no parameters are given', async () => {
    const { pagination } = await getJson<UsersResponse>('/api/users');
    assert.equal(pagination.page, 1);
    assert.equal(pagination.pageSize, 50);
  });

  it('treats whitespace-only search as no search at all', async () => {
    const all = await getJson<UsersResponse>('/api/users?pageSize=1');
    const blank = await getJson<UsersResponse>('/api/users?pageSize=1&q=%20%20%09%C2%A0');
    assert.equal(blank.pagination.total, all.pagination.total);
  });

  it('trims and collapses whitespace in search, including non-breaking spaces', async () => {
    const [someone] = (await getJson<UsersResponse>('/api/users?pageSize=1&page=5')).data;
    assert.ok(someone);
    const clean = `${someone.first_name} ${someone.last_name}`;
    const messy = `  ${someone.first_name}\u00a0\u00a0\t${someone.last_name}\u200b  `;
    const a = await getJson<UsersResponse>(`/api/users?q=${encodeURIComponent(clean)}`);
    const b = await getJson<UsersResponse>(`/api/users?q=${encodeURIComponent(messy)}`);
    assert.equal(b.pagination.total, a.pagination.total);
    assert.ok(b.data.some((user) => user.id === someone.id));
  });

  it('ignores blank and duplicate filter values', async () => {
    const noisy = await getJson<UsersResponse>('/api/users?hobbies=Reading,,Reading&pageSize=1');
    const clean = await getJson<UsersResponse>('/api/users?hobbies=Reading&pageSize=1');
    assert.equal(noisy.pagination.total, clean.pagination.total);
  });
});

describe('input validation', () => {
  const rejected: [string, string][] = [
    ['unknown sort field', '/api/users?sort=id'],
    ['sort injection attempt', '/api/users?sort=id;DROP TABLE users'],
    ['unknown sort order', '/api/users?order=sideways'],
    ['zero page', '/api/users?page=0'],
    ['non-numeric page', '/api/users?page=abc'],
    ['oversized pageSize', '/api/users?pageSize=5000'],
    ['search longer than the limit', `/api/users?q=${'a'.repeat(121)}`],
    [
      'search with too many words',
      `/api/users?q=${Array.from({ length: 11 }, () => 'a').join('%20')}`,
    ],
    ['oversized search on facets', `/api/facets?q=${'a'.repeat(121)}`],
  ];

  for (const [name, path] of rejected) {
    it(`rejects ${name} with 400`, async () => {
      const response = await get(path);
      assert.equal(response.status, 400);
      const body = (await response.json()) as { error?: string };
      assert.ok(body.error, 'a 400 should explain itself');
      assert.ok((body as { details?: unknown }).details, 'a 400 should name the offending field');
    });
  }

  it('rejects a filter list long enough to exhaust SQLite variables', async () => {
    const hobbies = Array.from({ length: 200 }, (_, i) => `h${i}`).join(',');
    assert.equal((await get(`/api/users?hobbies=${hobbies}`)).status, 400);
  });

  it('leaves the database intact after a rejected request', async () => {
    const { pagination } = await getJson<UsersResponse>('/api/users?pageSize=1');
    assert.equal(pagination.total, 300);
  });
});

describe('GET /api/facets', () => {
  it('returns value/count pairs for both dimensions', async () => {
    const { hobbies, nationalities } = await getJson<FacetsResponse>('/api/facets?q=a');
    for (const facet of [...hobbies, ...nationalities]) {
      assert.equal(typeof facet.value, 'string');
      assert.equal(typeof facet.count, 'number');
      assert.ok(facet.count > 0);
    }
  });
});

describe('GET /api/avatars/:seed.svg', () => {
  it('serves a deterministic, long-cacheable SVG from our own origin', async () => {
    const first = await get('/api/avatars/u1.svg');
    const second = await get('/api/avatars/u1.svg');
    assert.equal(first.status, 200);
    assert.match(first.headers.get('content-type') ?? '', /image\/svg\+xml/);
    assert.match(first.headers.get('cache-control') ?? '', /immutable/);
    assert.equal(first.headers.get('etag'), second.headers.get('etag'));
    assert.match(await first.text(), /^<svg/);
  });

  it('is what every seeded user points at', async () => {
    const { data } = await getJson<UsersResponse>('/api/users?pageSize=5');
    for (const user of data) assert.match(user.avatar, /^\/api\/avatars\/u\d+\.svg$/);
  });

  it('rejects a malformed seed', async () => {
    assert.equal((await get('/api/avatars/..%2F..%2Fetc.svg')).status, 400);
  });
});

describe('unknown routes', () => {
  it('names the unmatched route in the 404 body', async () => {
    const body = (await (await get('/api/nonsense')).json()) as { error: string };
    assert.match(body.error, /GET \/api\/nonsense/);
  });

  it('answers unknown API paths with JSON, never the SPA shell', async () => {
    const response = await get('/api/nonsense');
    assert.equal(response.status, 404);
    assert.match(response.headers.get('content-type') ?? '', /application\/json/);
  });
});
