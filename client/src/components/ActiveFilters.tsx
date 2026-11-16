import type { FilterState } from '../api/types.ts';
import { CloseIcon } from './Icon.tsx';

interface ActiveFiltersProps {
  filters: FilterState;
  onToggle: (kind: 'nationalities' | 'hobbies', value: string) => void;
  onClearQuery: () => void;
  onClearAgeRange: () => void;
  onClearAll: () => void;
}

const ageRangeLabel = (ageMin: number | null, ageMax: number | null): string => {
  if (ageMin !== null && ageMax !== null) return `Age ${ageMin}–${ageMax}`;
  if (ageMin !== null) return `Age ${ageMin}+`;
  return `Age up to ${ageMax}`;
};

export function ActiveFilters({
  filters,
  onToggle,
  onClearQuery,
  onClearAgeRange,
  onClearAll,
}: ActiveFiltersProps) {
  const chips = [
    ...(filters.q
      ? [{ key: `q:${filters.q}`, label: `“${filters.q}”`, remove: onClearQuery }]
      : []),
    ...(filters.ageMin !== null || filters.ageMax !== null
      ? [
          {
            key: 'age',
            label: ageRangeLabel(filters.ageMin, filters.ageMax),
            remove: onClearAgeRange,
          },
        ]
      : []),
    ...filters.nationalities.map((value) => ({
      key: `n:${value}`,
      label: value,
      remove: () => onToggle('nationalities', value),
    })),
    ...filters.hobbies.map((value) => ({
      key: `h:${value}`,
      label: value,
      remove: () => onToggle('hobbies', value),
    })),
  ];

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.remove}
          aria-label={`Remove filter ${chip.label}`}
          className="group flex items-center gap-1 rounded-full border border-line bg-ground py-1 pl-2.5 pr-1.5 text-xs text-ink transition-[background-color,transform] duration-150 hover:bg-sunk active:scale-[0.97]"
        >
          <span className="max-w-40 truncate">{chip.label}</span>
          <CloseIcon size={12} className="text-faint transition-colors group-hover:text-ink" />
        </button>
      ))}

      {chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="rounded-full px-2 py-1 text-xs font-medium text-accent transition-colors duration-150 hover:bg-accent-weak"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
