import { describe, expect, it } from 'vitest';

import { normalizeSearch, searchError, validateAgeRange } from './validation.ts';

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

describe('validateAgeRange', () => {
  it('treats empty inputs as no bound', () => {
    expect(validateAgeRange('', '')).toEqual({ min: null, max: null, errors: {}, valid: true });
  });

  it('accepts a one-sided range', () => {
    expect(validateAgeRange('30', '')).toMatchObject({ min: 30, max: null, valid: true });
    expect(validateAgeRange('', ' 40 ')).toMatchObject({ min: null, max: 40, valid: true });
  });

  it.each(['abc', '1e2', '-5', '12.5', '3 0', '+4'])(
    'rejects %j as not a whole number',
    (draft) => {
      const result = validateAgeRange(draft, '');
      expect(result.valid).toBe(false);
      expect(result.errors.min).toMatch(/whole number/);
    },
  );

  it('rejects ages outside 0–130', () => {
    expect(validateAgeRange('', '131').errors.max).toMatch(/between 0 and 130/);
  });

  it('rejects an inverted range on the max field', () => {
    const result = validateAgeRange('50', '20');
    expect(result.valid).toBe(false);
    expect(result.errors.max).toMatch(/greater than or equal to minimum/);
  });

  it('accepts an equal min and max', () => {
    expect(validateAgeRange('30', '30')).toMatchObject({ min: 30, max: 30, valid: true });
  });
});
