#!/usr/bin/env node

const base = (process.argv[2] ?? process.env.SMOKE_URL ?? 'http://localhost:7777').replace(
  /\/$/,
  '',
);
const TIMEOUT_MS = 10_000;

const fail = (message) => {
  throw new Error(message);
};
const expectStatus = (res, status) => {
  if (res.status !== status) fail(`expected HTTP ${status}, got ${res.status}`);
};

const checks = [
  {
    name: 'health: API up and database answering',
    path: '/api/health',
    expect: async (res) => {
      const body = await res.json();
      expectStatus(res, 200);
      if (body.status !== 'ok' || body.db?.status !== 'ok')
        fail(`unhealthy: ${JSON.stringify(body)}`);
      if (!(body.db.users > 0)) fail('database is empty');
      return `${body.db.users} users, schema v${body.db.schemaVersion}`;
    },
  },
  {
    name: 'users: first page with pagination',
    path: '/api/users?pageSize=5',
    expect: async (res) => {
      expectStatus(res, 200);
      const body = await res.json();
      if (!Array.isArray(body.data) || body.data.length === 0) fail('no rows');
      if (typeof body.pagination?.total !== 'number') fail('no pagination block');
      return `${body.pagination.total} total`;
    },
  },
  {
    name: 'users: whitespace in search is normalised',
    path: '/api/users?pageSize=1&q=%20%20a%20%20',
    expect: async (res) => {
      expectStatus(res, 200);
      return 'ok';
    },
  },
  {
    name: 'facets: top hobbies and nationalities',
    path: '/api/facets',
    expect: async (res) => {
      expectStatus(res, 200);
      const body = await res.json();
      if (!body.hobbies?.length || !body.nationalities?.length) fail('empty facets');
      return `${body.hobbies.length} hobbies, ${body.nationalities.length} nationalities`;
    },
  },
  {
    name: 'validation: unknown sort field is rejected',
    path: '/api/users?sort=password',
    expect: async (res) => {
      expectStatus(res, 400);
      return 'rejected with 400';
    },
  },
  {
    name: 'avatars: served from this origin',
    path: '/api/avatars/u1.svg',
    expect: async (res) => {
      expectStatus(res, 200);
      if (!(res.headers.get('content-type') ?? '').includes('svg')) fail('not an SVG');
      return 'ok';
    },
  },
  {
    name: 'client: app shell with security headers',
    path: '/',
    expect: async (res) => {
      expectStatus(res, 200);
      if (!(await res.text()).includes('<div id="root">')) fail('not the app shell');
      if (!res.headers.get('content-security-policy')) fail('missing Content-Security-Policy');
      return 'ok';
    },
  },
];

let failed = 0;
console.log(`Smoke test against ${base}\n`);

for (const check of checks) {
  const started = performance.now();
  let result;
  let ok = false;
  try {
    const res = await fetch(base + check.path, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    result = await check.expect(res);
    ok = true;
  } catch (error) {
    result = error instanceof Error ? error.message : String(error);
  }
  const ms = Math.round(performance.now() - started);
  if (!ok) failed += 1;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${check.name.padEnd(46)} ${String(ms).padStart(5)} ms  ${result}`,
  );
}

console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
