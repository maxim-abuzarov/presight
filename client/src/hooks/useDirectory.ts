import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchFacets, fetchUsers } from '../api/client.ts';
import type { FilterState } from '../api/types.ts';

const keyOf = (filters: FilterState) =>
  [filters.q, filters.nationalities, filters.hobbies] as const;

export function useUsers(filters: FilterState) {
  return useInfiniteQuery({
    queryKey: ['users', ...keyOf(filters), filters.sort, filters.order],
    queryFn: ({ pageParam, signal }) => fetchUsers(filters, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,

    placeholderData: (previous) => previous,
  });
}

export function useFacets(filters: FilterState) {
  return useQuery({
    queryKey: ['facets', ...keyOf(filters)],
    queryFn: ({ signal }) => fetchFacets(filters, signal),
    placeholderData: (previous) => previous,
  });
}
