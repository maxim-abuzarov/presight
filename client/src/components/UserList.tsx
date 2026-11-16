import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef } from 'react';

import type { User } from '../api/types.ts';
import { UserCard } from './UserCard.tsx';

interface UserListProps {
  users: User[];
  hasMore: boolean;
  isFetchingMore: boolean;
  /** Set when the last next-page request failed; automatic loading pauses until retried. */
  loadMoreError: string | null;
  onLoadMore: () => void;
}

const ROW_HEIGHT = 122;
const GAP = 8;

export function UserList({
  users,
  hasMore,
  isFetchingMore,
  loadMoreError,
  onLoadMore,
}: UserListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowCount = hasMore ? users.length + 1 : users.length;

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT + GAP,
    overscan: 6,
    getItemKey: (index) => users[index]?.id ?? `sentinel-${index}`,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const lastRow = virtualRows[virtualRows.length - 1];

  useEffect(() => {
    // After a failure, stop auto-loading: retrying in a loop would hammer a failing server.
    if (!lastRow || !hasMore || isFetchingMore || loadMoreError) return;
    if (lastRow.index >= users.length - 1) onLoadMore();
  }, [lastRow, hasMore, isFetchingMore, loadMoreError, users.length, onLoadMore]);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto overscroll-contain px-4 pt-1 pb-8 sm:px-6"
      tabIndex={0}
      aria-label="Directory records"
    >
      <div
        className="relative mx-auto w-full max-w-content"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualRows.map((row) => {
          const user = users[row.index];
          return (
            <div
              key={row.key}
              data-index={row.index}
              ref={virtualizer.measureElement}
              className="absolute inset-x-0 top-0"
              style={{ transform: `translateY(${row.start}px)`, paddingBottom: GAP }}
            >
              {user ? (
                <div
                  className="record-row"
                  style={{ '--row': Math.min(row.index, 9) } as React.CSSProperties}
                >
                  <UserCard user={user} />
                </div>
              ) : loadMoreError ? (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-center gap-3 py-6 text-sm text-muted"
                >
                  <span>Could not load more records. {loadMoreError}</span>
                  <button
                    type="button"
                    onClick={onLoadMore}
                    className="rounded-card border border-line-strong bg-surface px-3 py-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-sunk"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2.5 py-6 text-sm text-muted">
                  <span className="size-3.5 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
                  Loading more records
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
