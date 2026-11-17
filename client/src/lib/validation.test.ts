import { describe, expect, it } from 'vitest';

import { normalizeSearch, searchError } from './validation.ts';

describe('normalizeSearch', () => {
  it.each([
    ['', ''],
    ['   ', ''],
    ['\t  ', ''],
    ['  anna  ', 'anna'],
    ['anna    smith', 'anna smith'],
    ['anna smith', 'anna smith'],
    ['​anna', 'anna'],
    ['José', 'José'],
  ])('normalises %j to %j', (input, expected) => {
    expect(normalizeSearch(input)).toBe(expected);
  });
});

describe('searchError', () => {
  it('accepts ordinary input', () => {
    expect(searchError('anna smith')).toBeNull();
  });

  it('counts words after normalisation, so extra spaces do not count as words', () => {
    expect(searchError(`  ${'a '.repeat(10)}   `)).toBeNull();
  });

  it('rejects more than 10 words', () => {
    expect(searchError('a '.repeat(11))).toMatch(/at most 10 words/);
  });

  it('rejects more than 120 characters', () => {
    expect(searchError('a'.repeat(121))).toMatch(/at most 120 characters/);
  });
});
