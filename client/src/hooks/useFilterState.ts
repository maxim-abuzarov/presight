import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  SORT_FIELDS,
  SORT_ORDERS,
  type FilterState,
  type SortField,
  type SortOrder,
} from '../api/types.ts';

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

export function useFilterState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<FilterState>(() => {
    const sort = searchParams.get('sort');
    const order = searchParams.get('order');
    return {
      q: searchParams.get('q') ?? '',
      nationalities: searchParams.getAll('nationalities'),
      hobbies: searchParams.getAll('hobbies'),
      sort: isSortField(sort) ? sort : DEFAULT_FILTERS.sort,
      order: isSortOrder(order) ? order : DEFAULT_FILTERS.order,
    };
  }, [searchParams]);

  const write = useCallback(
    (next: FilterState, replace: boolean) => {
      const params = new URLSearchParams();

      if (next.q) params.set('q', next.q);
      for (const value of next.nationalities) params.append('nationalities', value);
      for (const value of next.hobbies) params.append('hobbies', value);
      if (next.sort !== DEFAULT_FILTERS.sort) params.set('sort', next.sort);
      if (next.order !== DEFAULT_FILTERS.order) params.set('order', next.order);
      setSearchParams(params, { replace });
    },
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
        : [...current, value];
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
