import { Suspense, lazy, useCallback, useMemo, useState } from 'react';

import { ApiError } from './api/client.ts';
import { ActiveFilters } from './components/ActiveFilters.tsx';
import { FilterDrawer } from './components/FilterDrawer.tsx';
import { FilterSidebar } from './components/FilterSidebar.tsx';
import { FilterIcon } from './components/Icon.tsx';
import { Container } from './components/Container.tsx';
import { Presight } from './components/Presight.tsx';
import { SearchField } from './components/SearchField.tsx';
import { SortControls } from './components/SortControls.tsx';
import { EmptyState, ErrorState, SkeletonList } from './components/States.tsx';
import { ThemeToggle } from './components/ThemeToggle.tsx';
import { UserList } from './components/UserList.tsx';
import { useFacets, useUsers } from './hooks/useDirectory.ts';
import { useFilterState } from './hooks/useFilterState.ts';
import { useTheme } from './hooks/useTheme.ts';

const SpiderWeb = lazy(() =>
  import('./components/SpiderWeb.tsx').then((module) => ({ default: module.SpiderWeb })),
);

const EASTER_EGGS: Record<string, 'presight' | 'spider'> = {
  presight: 'presight',
  'peter parker': 'spider',
  spiderman: 'spider',
  'spider man': 'spider',
};

function describeError(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong while loading records.';
  return error.requestId
    ? `${error.message} (reference ${error.requestId.slice(0, 8)})`
    : error.message;
}

export default function App() {
  const { filters, setQuery, setSort, toggleFacet, setAgeRange, clearFilters, activeFilterCount } =
    useFilterState();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const usersQuery = useUsers(filters);
  const facetsQuery = useFacets(filters);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = usersQuery;

  const users = useMemo(
    () => usersQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [usersQuery.data],
  );
  const total = usersQuery.data?.pages[0]?.pagination.total ?? 0;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const easterEgg = EASTER_EGGS[filters.q.toLowerCase()];
  const isInitialLoad = usersQuery.isPending;
  // A failed *next* page keeps the records already on screen and offers a retry at the bottom;
  // only a failure of the first page replaces the list with the error state. Facet failures
  // stay in the sidebar — the list is still usable without them.
  const listError = usersQuery.isFetchNextPageError ? null : usersQuery.error;

  const sidebar = {
    filters,
    facets: facetsQuery.data,
    loading: facetsQuery.isPending,
    error: facetsQuery.error ? describeError(facetsQuery.error) : null,
    onRetry: () => facetsQuery.refetch(),
    activeFilterCount,
    onToggle: toggleFacet,
    onAgeRangeChange: setAgeRange,
    onClear: clearFilters,
  };

  function renderResults() {
    if (listError) {
      return (
        <Container className="pt-6">
          <ErrorState message={describeError(listError)} onRetry={() => usersQuery.refetch()} />
        </Container>
      );
    }

    if (isInitialLoad) {
      return (
        <Container className="pt-4">
          <SkeletonList />
        </Container>
      );
    }

    if (users.length === 0) {
      return (
        <Container className="pt-6">
          {easterEgg === 'presight' ? (
            <Presight />
          ) : easterEgg === 'spider' ? (
            <Suspense fallback={null}>
              <div className="presight-card overflow-hidden rounded-card border border-line bg-surface">
                <SpiderWeb />
              </div>
            </Suspense>
          ) : (
            <EmptyState onClear={clearFilters} hasFilters={activeFilterCount > 0} />
          )}
        </Container>
      );
    }

    return (
      <div className="record-in relative h-full pt-4">
        <div aria-hidden="true" className="list-scrim" />
        <UserList
          users={users}
          hasMore={hasNextPage}
          isFetchingMore={isFetchingNextPage}
          loadMoreError={usersQuery.isFetchNextPageError ? describeError(usersQuery.error) : null}
          onLoadMore={loadMore}
        />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
        <h1 className="text-sm font-semibold tracking-tight text-ink">People Directory</h1>
        <div className="ml-auto">
          <ThemeToggle theme={theme} onChange={setTheme} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="rail hidden w-72 shrink-0 border-r border-line lg:block">
          <FilterSidebar {...sidebar} />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 flex-col gap-3 border-b border-line bg-surface py-3">
            <Container>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="flex h-10 items-center gap-2 rounded-card border border-line bg-surface px-3 text-sm font-medium text-ink transition-colors duration-150 hover:border-line-strong lg:hidden"
                >
                  <FilterIcon size={16} />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="nums flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-ink">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <SearchField value={filters.q} onChange={setQuery} />
                <SortControls sort={filters.sort} order={filters.order} onChange={setSort} />
              </div>
            </Container>

            <Container>
              <p className="nums text-xs text-muted" aria-live="polite" aria-atomic="true">
                {isInitialLoad
                  ? 'Loading records'
                  : `${total.toLocaleString()} ${total === 1 ? 'person' : 'people'} match`}
                {usersQuery.isFetching && !isFetchingNextPage && !isInitialLoad && (
                  <span className="ml-2 text-faint">updating</span>
                )}
              </p>
            </Container>

            <Container className="empty:hidden">
              <ActiveFilters
                filters={filters}
                onToggle={toggleFacet}
                onClearQuery={() => setQuery('')}
                onClearAgeRange={() => setAgeRange(null, null)}
                onClearAll={clearFilters}
              />
            </Container>
          </div>

          <div className="min-h-0 flex-1">{renderResults()}</div>
        </main>
      </div>

      <FilterDrawer open={drawerOpen} onClose={closeDrawer} {...sidebar} />
    </div>
  );
}
