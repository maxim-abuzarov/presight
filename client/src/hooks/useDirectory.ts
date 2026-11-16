import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchFacets, fetchUsers } from '../api/client.ts';
import type { FilterState } from '../api/types.ts';

/**
 * The query key is the request: everything that changes the response is in it, nothing else is.
 * Facets do not depend on sort, so changing sort does not refetch the sidebar.
 *
 * The query functions deliberately do not take React Query's AbortSignal. When a query function
 * reads the signal, React Query aborts the fetch as soon as the query has no observers — and in
 * development React StrictMode mounts, unmounts and remounts every component, so the very first
 * /api/users and /api/facets requests were aborted on every page load and showed up in the
 * network panel as failed (net::ERR_ABORTED). Our requests take a few milliseconds, so the
 * bandwidth cancellation would save is negligible, while a clean network log on startup matters.
 * Out-of-order responses are still harmless: each response is stored under its own key.
 */
export function useUsers(filters: FilterState) {
  return useInfiniteQuery({
    queryKey: [
      'users',
      filters.q,
      filters.nationalities,
      filters.hobbies,
      filters.ageMin,
      filters.ageMax,
      filters.sort,
      filters.order,
    ],
    queryFn: ({ pageParam }) => fetchUsers(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    // Keep showing the previous results while the next filter state loads, instead of flashing
    // a skeleton on every keystroke.
    placeholderData: keepPreviousData,
  });
}

export function useFacets(filters: FilterState) {
  return useQuery({
    queryKey: [
      'facets',
      filters.q,
      filters.nationalities,
      filters.hobbies,
      filters.ageMin,
      filters.ageMax,
    ],
    queryFn: () => fetchFacets(filters),
    placeholderData: keepPreviousData,
  });
}
