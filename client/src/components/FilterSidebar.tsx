import type { FacetsResponse, FilterState } from '../api/types.ts';
import { FacetGroup } from './FacetGroup.tsx';

export interface FilterSidebarProps {
  filters: FilterState;
  facets: FacetsResponse | undefined;
  loading: boolean;
  activeFilterCount: number;
  onToggle: (kind: 'nationalities' | 'hobbies', value: string) => void;
  onClear: () => void;
}

export function FilterSidebar({
  filters,
  facets,
  loading,
  activeFilterCount,
  onToggle,
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
