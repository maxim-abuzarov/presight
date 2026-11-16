import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeSearch, searchTerms } from './users.limits.js';

describe('normalizeSearch', () => {
  const cases: [string, string | null | undefined, string][] = [
    ['undefined', undefined, ''],
    ['null', null, ''],
    ['spaces only', '   ', ''],
    ['tabs and newlines only', '\t\n ', ''],
    ['leading and trailing spaces', '  anna  ', 'anna'],
    ['internal runs of spaces', 'anna    smith', 'anna smith'],
    ['non-breaking spaces', 'anna  smith', 'anna smith'],
    ['ideographic space', 'anna　smith', 'anna smith'],
    ['zero-width characters', '​anna‍ smith﻿', 'anna smith'],
    ['decomposed accents become composed', 'José', 'José'],
    ['case is preserved for display', 'Anna', 'Anna'],
  ];

  for (const [name, input, expected] of cases) {
    it(`handles ${name}`, () => assert.equal(normalizeSearch(input), expected));
  }
});

describe('searchTerms', () => {
  it('splits a normalised string into lowercase words', () => {
    assert.deepEqual(searchTerms('Anna Smith'), ['anna', 'smith']);
  });

  it('returns no terms for an empty string', () => {
    assert.deepEqual(searchTerms(''), []);
  });
});
