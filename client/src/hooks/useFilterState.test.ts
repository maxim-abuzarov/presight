import { describe, expect, it } from 'vitest';

import { DEFAULT_FILTERS, parseFilters, serializeFilters } from './useFilterState.ts';

const parse = (query: string) => parseFilters(new URLSearchParams(query));

describe('parseFilters', () => {
  it('returns the defaults for an empty URL', () => {
    expect(parse('')).toEqual(DEFAULT_FILTERS);
  });

  it('normalises whitespace in the search text', () => {
    expect(parse('q=%20%20anna%20%20%20smith%20').q).toBe('anna smith');
    expect(parse('q=%20%20%20').q).toBe('');
  });

  it('reads repeated and comma-separated lists alike, de-duplicated', () => {
    expect(parse('hobbies=Chess,Reading&hobbies=Chess').hobbies).toEqual(['Chess', 'Reading']);
  });

  it('falls back to defaults for an unknown sort or order', () => {
    const filters = parse('sort=password&order=sideways');
    expect(filters.sort).toBe('first_name');
    expect(filters.order).toBe('asc');
  });

  it('keeps a valid age range', () => {
    expect(parse('ageMin=20&ageMax=30')).toMatchObject({ ageMin: 20, ageMax: 30 });
  });

  it.each(['ageMin=abc', 'ageMin=-1', 'ageMax=999', 'ageMin=50&ageMax=20', 'ageMin=1.5'])(
    'drops an invalid age range from %s rather than sending it to the API',
    (query) => {
      expect(parse(query)).toMatchObject({ ageMin: null, ageMax: null });
    },
  );
});

describe('serializeFilters', () => {
  it('omits defaults so the canonical URL for the default view is empty', () => {
    expect(serializeFilters(DEFAULT_FILTERS).toString()).toBe('');
  });

  it('round-trips through parseFilters', () => {
    const filters = {
      ...DEFAULT_FILTERS,
      q: 'anna',
      nationalities: ['France', 'Japan'],
      hobbies: ['Chess'],
      ageMin: 20,
      ageMax: null,
      sort: 'age' as const,
      order: 'desc' as const,
    };
    expect(parseFilters(serializeFilters(filters))).toEqual(filters);
  });
});
