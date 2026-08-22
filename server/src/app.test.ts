import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { after, before, describe, it } from 'node:test';

import { createApp } from './app.js';
import { closeDb, useDatabase } from './db/connection.js';
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
  it('reports readiness', async () => {
    assert.deepEqual(await getJson('/api/health'), { ok: true });
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
  ];

  for (const [name, path] of rejected) {
    it(`rejects ${name} with 400`, async () => {
      const response = await get(path);
      assert.equal(response.status, 400);
      const body = (await response.json()) as { error?: string };
      assert.ok(body.error, 'a 400 should explain itself');
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

describe('unknown routes', () => {
  it('answers unknown API paths with JSON, never the SPA shell', async () => {
    const response = await get('/api/nonsense');
    assert.equal(response.status, 404);
    assert.match(response.headers.get('content-type') ?? '', /application\/json/);
  });
});
