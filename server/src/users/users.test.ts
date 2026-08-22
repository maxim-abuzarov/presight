import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { closeDb, useDatabase } from '../db/connection.js';
import { seed } from '../db/seed.js';
import { getFacets, getUsers } from './users.service.js';
import type { ListUsersInput, UserFilters } from './users.types.js';

const SIZE = 1_000;

const filters = (overrides: Partial<UserFilters> = {}): UserFilters => ({
  nationalities: [],
  hobbies: [],
  ...overrides,
});

const list = (overrides: Partial<ListUsersInput> = {}): ListUsersInput => ({
  ...filters(),
  sort: 'first_name',
  order: 'asc',
  page: 1,
  pageSize: 50,
  ...overrides,
});

before(() => {
  useDatabase(':memory:');
  seed(SIZE);
});

after(() => closeDb());

describe('text filter', () => {
  it('matches first_name or last_name, and nothing else', () => {
    const { data, pagination } = getUsers(list({ q: 'mar', pageSize: 100 }));
    assert.ok(pagination.total > 0, 'expected the fixture to contain matches');
    for (const user of data) {
      const haystack = `${user.first_name} ${user.last_name}`.toLowerCase();
      assert.ok(haystack.includes('mar'), `${haystack} should contain "mar"`);
    }
  });

  it('is case-insensitive for non-ASCII names', () => {
    const lower = getUsers(list({ q: 'í', pageSize: 1 })).pagination.total;
    const upper = getUsers(list({ q: 'Í', pageSize: 1 })).pagination.total;
    assert.ok(lower > 0, 'fixture should contain accented names');
    assert.equal(upper, lower);
  });

  it('matches a full name typed across both fields', () => {
    const [someone] = getUsers(list({ page: 7, pageSize: 1 })).data;
    assert.ok(someone);

    const fullName = `${someone.first_name} ${someone.last_name}`;
    const { data } = getUsers(list({ q: fullName, pageSize: 100 }));
    assert.ok(
      data.some((user) => user.id === someone.id),
      `searching "${fullName}" should find that user`,
    );

    const reversed = getUsers(list({ q: `${someone.last_name}   ${someone.first_name}` }));
    assert.ok(reversed.data.some((user) => user.id === someone.id));
  });

  it('requires every term to match, so extra words narrow the set', () => {
    const one = getUsers(list({ q: 'a', pageSize: 1 })).pagination.total;
    const two = getUsers(list({ q: 'a e', pageSize: 1 })).pagination.total;
    assert.ok(two < one, 'a second term must narrow the result set');
    assert.equal(getUsers(list({ q: 'a zzzzzzzz' })).pagination.total, 0);
  });

  it('treats LIKE wildcards as literal characters', () => {
    assert.equal(getUsers(list({ q: '%' })).pagination.total, 0);
    assert.equal(getUsers(list({ q: '_' })).pagination.total, 0);
  });
});

describe('filter semantics', () => {
  it('matches users having ALL selected hobbies', () => {
    const both = getUsers(list({ hobbies: ['Reading', 'Travel'], pageSize: 100 }));
    for (const user of both.data) {
      assert.ok(user.hobbies.includes('Reading') && user.hobbies.includes('Travel'));
    }

    const reading = getUsers(list({ hobbies: ['Reading'], pageSize: 1 })).pagination.total;
    assert.ok(both.pagination.total < reading, 'AND must narrow, not widen');
  });

  it('matches users from ANY selected nationality', () => {
    const either = getUsers(list({ nationalities: ['France', 'Japan'], pageSize: 100 }));
    for (const user of either.data) {
      assert.ok(['France', 'Japan'].includes(user.nationality));
    }

    const france = getUsers(list({ nationalities: ['France'], pageSize: 1 })).pagination.total;
    const japan = getUsers(list({ nationalities: ['Japan'], pageSize: 1 })).pagination.total;
    assert.equal(either.pagination.total, france + japan, 'OR must be the union');
  });

  it('applies text, nationality and hobby filters together', () => {
    const { data } = getUsers(
      list({ q: 'a', nationalities: ['France'], hobbies: ['Reading'], pageSize: 100 }),
    );
    for (const user of data) {
      assert.ok(`${user.first_name} ${user.last_name}`.toLowerCase().includes('a'));
      assert.equal(user.nationality, 'France');
      assert.ok(user.hobbies.includes('Reading'));
    }
  });

  it('returns an empty page for an unmatched filter', () => {
    const { data, pagination } = getUsers(list({ q: 'zzzzzzzz' }));
    assert.deepEqual(data, []);
    assert.equal(pagination.total, 0);
    assert.equal(pagination.hasMore, false);
  });
});

describe('sorting', () => {
  for (const sort of ['first_name', 'last_name', 'age', 'nationality'] as const) {
    for (const order of ['asc', 'desc'] as const) {
      it(`is deterministic and ordered for ${sort} ${order}`, () => {
        const input = list({ sort, order, pageSize: 100 });
        const first = getUsers(input).data;
        const second = getUsers(input).data;
        assert.deepEqual(
          first.map((user) => user.id),
          second.map((user) => user.id),
          'the same request must return the same rows',
        );

        const key = (user: (typeof first)[number]) =>
          sort === 'age'
            ? user.age
            : String(user[sort === 'nationality' ? 'nationality' : sort]).toLowerCase();

        for (let i = 1; i < first.length; i += 1) {
          const previous = key(first[i - 1]!);
          const current = key(first[i]!);
          const inOrder = order === 'asc' ? previous <= current : previous >= current;
          assert.ok(inOrder, `${String(previous)} then ${String(current)} breaks ${sort} ${order}`);

          if (previous === current) {
            assert.ok(first[i - 1]!.id < first[i]!.id, 'ties must break on ascending id');
          }
        }
      });
    }
  }
});

describe('pagination', () => {
  it('walks every page without duplicates or gaps', () => {
    const pageSize = 40;
    const seen = new Set<number>();
    let page = 1;
    let total = 0;

    for (;;) {
      const result = getUsers(list({ q: 'a', sort: 'age', order: 'desc', page, pageSize }));
      total = result.pagination.total;
      for (const user of result.data) {
        assert.ok(!seen.has(user.id), `user ${user.id} appeared on two pages`);
        seen.add(user.id);
      }
      if (!result.pagination.hasMore) break;
      page += 1;
    }

    assert.equal(seen.size, total, 'collected users must equal the reported total');
  });

  it('reports metadata the client can page on', () => {
    const { pagination } = getUsers(list({ pageSize: 30 }));
    assert.equal(pagination.page, 1);
    assert.equal(pagination.pageSize, 30);
    assert.equal(pagination.total, SIZE);
    assert.equal(pagination.totalPages, Math.ceil(SIZE / 30));
    assert.equal(pagination.hasMore, true);
  });

  it('returns an empty page past the end instead of failing', () => {
    const { data, pagination } = getUsers(list({ page: 9_999 }));
    assert.deepEqual(data, []);
    assert.equal(pagination.hasMore, false);
    assert.equal(pagination.total, SIZE);
  });
});

describe('facets', () => {
  it('returns at most the top 20 of each, ordered by count', () => {
    const { hobbies, nationalities } = getFacets(filters());
    assert.ok(hobbies.length <= 20 && nationalities.length <= 20);

    for (const facet of [hobbies, nationalities]) {
      for (let i = 1; i < facet.length; i += 1) {
        const previous = facet[i - 1]!;
        const current = facet[i]!;
        assert.ok(
          previous.count > current.count ||
            (previous.count === current.count && previous.value <= current.value),
          'facets must order by count desc, then value asc',
        );
      }
    }
  });

  it('hobby counts reflect the active filters, not the global dataset', () => {
    const active = filters({ q: 'an', nationalities: ['France'] });

    for (const hobby of getFacets(active).hobbies.slice(0, 5)) {
      const total = getUsers(list({ ...active, hobbies: [hobby.value], pageSize: 1 })).pagination
        .total;
      assert.equal(total, hobby.count, `selecting "${hobby.value}" should yield its facet count`);
    }
  });

  it('keeps other nationalities selectable once one is chosen', () => {
    const withOne = getFacets(filters({ nationalities: ['France'] })).nationalities;
    assert.ok(withOne.length > 1, 'selecting a country must not collapse the list to itself');
    assert.ok(
      withOne.some((facet) => facet.value !== 'France'),
      'other countries must remain available to add',
    );
  });

  it('nationality counts still honour the text and hobby filters', () => {
    const active = filters({ q: 'an', hobbies: ['Reading'] });
    const facet = getFacets(active).nationalities[0];
    assert.ok(facet);

    const total = getUsers(list({ ...active, nationalities: [facet.value], pageSize: 1 }))
      .pagination.total;
    assert.equal(total, facet.count, 'selecting a country should yield exactly its facet count');

    const global = getUsers(list({ nationalities: [facet.value], pageSize: 1 })).pagination.total;
    assert.ok(
      facet.count < global,
      'the count must describe the filtered set, not the whole table',
    );
  });

  it('nationality counts sum to the total across a multi-country selection', () => {
    const active = filters({ q: 'an' });
    const [first, second] = getFacets(active).nationalities;
    assert.ok(first && second);

    const combined = getUsers(
      list({ ...active, nationalities: [first.value, second.value], pageSize: 1 }),
    ).pagination.total;
    assert.equal(combined, first.count + second.count);
  });

  it('narrows as filters are added', () => {
    const global = getFacets(filters()).hobbies[0]!;
    const scoped = getFacets(filters({ nationalities: ['France'] })).hobbies;
    const sameHobby = scoped.find((facet) => facet.value === global.value);
    assert.ok(!sameHobby || sameHobby.count < global.count, 'a filter must not widen a count');
  });

  it('returns empty facets for an unmatched filter', () => {
    const { hobbies, nationalities } = getFacets(filters({ q: 'zzzzzzzz' }));
    assert.deepEqual(hobbies, []);
    assert.deepEqual(nationalities, []);
  });
});

describe('seed', () => {
  it('gives every user between 0 and 10 hobbies, covering both ends', () => {
    const counts = new Set<number>();
    for (let page = 1; ; page += 1) {
      const result = getUsers(list({ page, pageSize: 100 }));
      for (const user of result.data) {
        assert.ok(user.hobbies.length >= 0 && user.hobbies.length <= 10);
        counts.add(user.hobbies.length);
      }
      if (!result.pagination.hasMore) break;
    }
    assert.ok(counts.has(0), 'some user must have no hobbies');
    assert.ok(counts.has(10), 'some user must have the maximum of 10 hobbies');
  });

  it('populates every field the brief requires', () => {
    const [user] = getUsers(list({ pageSize: 1 })).data;
    assert.ok(user);
    assert.ok(user.avatar.startsWith('https://'));
    assert.ok(user.first_name.length > 0);
    assert.ok(user.last_name.length > 0);
    assert.ok(user.age >= 18 && user.age <= 72);
    assert.ok(user.nationality.length > 0);
    assert.ok(Array.isArray(user.hobbies));
  });
});
