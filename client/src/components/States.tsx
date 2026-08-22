import { AlertIcon, RetryIcon, SearchIcon } from './Icon.tsx';

export function SkeletonList({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex gap-4 rounded-card border border-line bg-surface px-4 py-4 sm:gap-5 sm:px-5"
        >
          <div className="skeleton size-12 shrink-0 rounded-full sm:size-14" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="skeleton h-3.5 w-40 rounded-sm" />
            <div className="skeleton h-3 w-24 rounded-sm" />
            <div className="flex gap-1.5 pt-2">
              <div className="skeleton h-6 w-20 rounded-full" />
              <div className="skeleton h-6 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ onClear, hasFilters }: { onClear: () => void; hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
      <SearchIcon size={22} className="text-faint" />
      <p className="text-base font-semibold text-ink">No one matches these filters</p>
      <p className="max-w-sm text-sm text-muted">
        {hasFilters
          ? 'Try removing a hobby or nationality, or search for a different name.'
          : 'The directory is empty. Seed the database to get started.'}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="mt-1 rounded-card border border-line-strong bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-sunk"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface px-6 py-16 text-center"
    >
      <AlertIcon size={22} className="text-danger" />
      <p className="text-base font-semibold text-ink">Could not load the directory</p>
      <p className="max-w-md text-sm text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 inline-flex items-center gap-2 rounded-card border border-line-strong bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-sunk"
      >
        <RetryIcon size={15} />
        Try again
      </button>
    </div>
  );
}
