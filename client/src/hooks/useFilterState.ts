import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  SORT_FIELDS,
  SORT_ORDERS,
  type FilterState,
  type SortField,
  type SortOrder,
} from '../api/types.ts';
import { LIMITS, normalizeSearch, validateAgeRange } from '../lib/validation.ts';

export const DEFAULT_FILTERS: FilterState = {
  q: '',
  nationalities: [],
  hobbies: [],
  ageMin: null,
  ageMax: null,
  sort: 'first_name',
  order: 'asc',
};

const isSortField = (value: string | null): value is SortField =>
  SORT_FIELDS.includes(value as SortField);

const isSortOrder = (value: string | null): value is SortOrder =>
  SORT_ORDERS.includes(value as SortOrder);

/** Same rules as the server: repeated or comma-separated, trimmed, de-duplicated, capped. */
function parseList(values: string[]): string[] {
  const parsed = values.flatMap((value) => value.split(',')).map((value) => value.trim());
  return [...new Set(parsed.filter(Boolean))].slice(0, LIMITS.maxFilterValues);
}

/**
 * URL → state. The URL is user input (people edit and share links), so it is parsed leniently
 * into a state that is always valid: an unknown sort falls back to the default, an age that is
 * not a whole number in range is dropped, an inverted range is dropped. The API therefore never
 * receives a request the UI built from a bad link, and the page never shows an error for it.
 */
export function parseFilters(searchParams: URLSearchParams): FilterState {
  const sort = searchParams.get('sort');
  const order = searchParams.get('order');
  const age = validateAgeRange(searchParams.get('ageMin') ?? '', searchParams.get('ageMax') ?? '');

  return {
    q: normalizeSearch(searchParams.get('q')).slice(0, LIMITS.searchMaxLength),
    nationalities: parseList(searchParams.getAll('nationalities')),
    hobbies: parseList(searchParams.getAll('hobbies')),
    ageMin: age.valid ? age.min : null,
    ageMax: age.valid ? age.max : null,
    sort: isSortField(sort) ? sort : DEFAULT_FILTERS.sort,
    order: isSortOrder(order) ? order : DEFAULT_FILTERS.order,
  };
}

/** State → URL, in one canonical form: defaults omitted, fixed parameter order. */
export function serializeFilters(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  const q = normalizeSearch(filters.q);
  if (q) params.set('q', q);
  for (const value of filters.nationalities) params.append('nationalities', value);
  for (const value of filters.hobbies) params.append('hobbies', value);
  if (filters.ageMin !== null) params.set('ageMin', String(filters.ageMin));
  if (filters.ageMax !== null) params.set('ageMax', String(filters.ageMax));
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set('sort', filters.sort);
  if (filters.order !== DEFAULT_FILTERS.order) params.set('order', filters.order);
  return params;
}

/**
 * The URL is the single source of truth for the view. Components read `filters` from it and
 * change it only through these setters, so reload, share and back/forward all just work.
 */
export function useFilterState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  // If the URL was not canonical (stray spaces, an invalid age, ?sort=bogus), rewrite it in
  // place so the address bar shows exactly the view being displayed.
  useEffect(() => {
    const canonical = serializeFilters(filters).toString();
    if (canonical !== searchParams.toString()) {
      setSearchParams(new URLSearchParams(canonical), { replace: true });
    }
  }, [filters, searchParams, setSearchParams]);

  const write = useCallback(
    (next: FilterState, replace: boolean) => setSearchParams(serializeFilters(next), { replace }),
    [setSearchParams],
  );

  // Typing replaces the history entry (no entry per keystroke); discrete choices push one, so
  // Back undoes the last filter click.
  const setQuery = useCallback((q: string) => write({ ...filters, q }, true), [filters, write]);

  const setAgeRange = useCallback(
    (ageMin: number | null, ageMax: number | null) => write({ ...filters, ageMin, ageMax }, true),
    [filters, write],
  );

  const setSort = useCallback(
    (sort: SortField, order: SortOrder) => write({ ...filters, sort, order }, false),
    [filters, write],
  );

  const toggleFacet = useCallback(
    (kind: 'nationalities' | 'hobbies', value: string) => {
      const current = filters[kind];
      const next = current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value].slice(0, LIMITS.maxFilterValues);
      write({ ...filters, [kind]: next }, false);
    },
    [filters, write],
  );

  const clearFilters = useCallback(
    () => write({ ...DEFAULT_FILTERS, sort: filters.sort, order: filters.order }, false),
    [filters.sort, filters.order, write],
  );

  const activeFilterCount =
    filters.nationalities.length +
    filters.hobbies.length +
    (filters.q ? 1 : 0) +
    (filters.ageMin !== null || filters.ageMax !== null ? 1 : 0);

  return { filters, setQuery, setSort, toggleFacet, setAgeRange, clearFilters, activeFilterCount };
}
