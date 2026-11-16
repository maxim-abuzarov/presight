import type { FacetsResponse, FilterState } from '../api/types.ts';
import { AgeRangeFilter } from './AgeRangeFilter.tsx';
import { FacetGroup } from './FacetGroup.tsx';

export interface FilterSidebarProps {
  filters: FilterState;
  facets: FacetsResponse | undefined;
  loading: boolean;
  /** Set when facets failed to load; the list itself may still be fine. */
  error: string | null;
  onRetry: () => void;
  activeFilterCount: number;
  onToggle: (kind: 'nationalities' | 'hobbies', value: string) => void;
  onAgeRangeChange: (ageMin: number | null, ageMax: number | null) => void;
  onClear: () => void;
}

export function FilterSidebar({
  filters,
  facets,
  loading,
  error,
  onRetry,
  activeFilterCount,
  onToggle,
  onAgeRangeChange,
  onClear,
}: FilterSidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <h2 className="text-sm font-semibold text-ink">Filters</h2>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-sm px-1.5 py-0.5 text-xs font-medium text-accent transition-colors duration-150 hover:bg-accent-weak"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-5">
        {error && (
          <div
            role="alert"
            className="rounded-card border border-line px-3 py-2.5 text-xs text-muted"
          >
            <p>Filter counts could not be loaded. {error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-1.5 font-medium text-accent hover:underline"
            >
              Try again
            </button>
          </div>
        )}
        <AgeRangeFilter
          ageMin={filters.ageMin}
          ageMax={filters.ageMax}
          onChange={onAgeRangeChange}
        />
        <FacetGroup
          title="Nationality"
          hint="Any selected country matches."
          facets={facets?.nationalities ?? []}
          selected={filters.nationalities}
          loading={loading}
          onToggle={(value) => onToggle('nationalities', value)}
        />
        <FacetGroup
          title="Hobbies"
          hint="Must have every selected hobby."
          facets={facets?.hobbies ?? []}
          selected={filters.hobbies}
          loading={loading}
          onToggle={(value) => onToggle('hobbies', value)}
        />
      </div>
    </div>
  );
}
