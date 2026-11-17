import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchFacets, fetchUsers } from '../api/client.ts';
import type { FilterState } from '../api/types.ts';

export function useUsers(filters: FilterState) {
  return useInfiniteQuery({
    queryKey: [
      'users',
      filters.q,
      filters.nationalities,
      filters.hobbies,
      filters.sort,
      filters.order,
    ],
    queryFn: ({ pageParam }) => fetchUsers(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    placeholderData: keepPreviousData,
  });
}

export function useFacets(filters: FilterState) {
  return useQuery({
    queryKey: ['facets', filters.q, filters.nationalities, filters.hobbies],
    queryFn: () => fetchFacets(filters),
    placeholderData: keepPreviousData,
  });
}
