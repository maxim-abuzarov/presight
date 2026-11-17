import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  SORT_FIELDS,
  SORT_ORDERS,
  type FilterState,
  type SortField,
  type SortOrder,
} from '../api/types.ts';
import { LIMITS, normalizeSearch } from '../lib/validation.ts';

export const DEFAULT_FILTERS: FilterState = {
  q: '',
  nationalities: [],
  hobbies: [],
  sort: 'first_name',
  order: 'asc',
};

const isSortField = (value: string | null): value is SortField =>
  SORT_FIELDS.includes(value as SortField);

const isSortOrder = (value: string | null): value is SortOrder =>
  SORT_ORDERS.includes(value as SortOrder);

function parseList(values: string[]): string[] {
  const parsed = values.flatMap((value) => value.split(',')).map((value) => value.trim());
  return [...new Set(parsed.filter(Boolean))].slice(0, LIMITS.maxFilterValues);
}

export function parseFilters(searchParams: URLSearchParams): FilterState {
  const sort = searchParams.get('sort');
  const order = searchParams.get('order');

  return {
    q: normalizeSearch(searchParams.get('q')).slice(0, LIMITS.searchMaxLength),
    nationalities: parseList(searchParams.getAll('nationalities')),
    hobbies: parseList(searchParams.getAll('hobbies')),
    sort: isSortField(sort) ? sort : DEFAULT_FILTERS.sort,
    order: isSortOrder(order) ? order : DEFAULT_FILTERS.order,
  };
}

export function serializeFilters(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  const q = normalizeSearch(filters.q);
  if (q) params.set('q', q);
  for (const value of filters.nationalities) params.append('nationalities', value);
  for (const value of filters.hobbies) params.append('hobbies', value);
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set('sort', filters.sort);
  if (filters.order !== DEFAULT_FILTERS.order) params.set('order', filters.order);
  return params;
}

export function useFilterState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

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

  const setQuery = useCallback((q: string) => write({ ...filters, q }, true), [filters, write]);

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
    filters.nationalities.length + filters.hobbies.length + (filters.q ? 1 : 0);

  return { filters, setQuery, setSort, toggleFacet, clearFilters, activeFilterCount };
}
