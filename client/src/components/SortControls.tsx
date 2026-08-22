import { SORT_FIELDS, type SortField, type SortOrder } from '../api/types.ts';
import { AscIcon, DescIcon } from './Icon.tsx';

const FIELD_LABELS: Record<SortField, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  age: 'Age',
  nationality: 'Nationality',
};

const ORDERS: Record<SortOrder, { label: string; next: SortOrder; Icon: typeof AscIcon }> = {
  asc: { label: 'Ascending', next: 'desc', Icon: AscIcon },
  desc: { label: 'Descending', next: 'asc', Icon: DescIcon },
};

interface SortControlsProps {
  sort: SortField;
  order: SortOrder;
  onChange: (sort: SortField, order: SortOrder) => void;
}

export function SortControls({ sort, order, onChange }: SortControlsProps) {
  const current = ORDERS[order];
  const next = ORDERS[current.next];

  return (
    <div className="flex items-center gap-1.5">
      <label className="sr-only" htmlFor="sort-field">
        Sort by
      </label>
      <select
        id="sort-field"
        value={sort}
        onChange={(event) => onChange(event.target.value as SortField, order)}
        className="h-10 rounded-card border border-line bg-surface px-2.5 text-sm text-ink transition-colors duration-150 hover:border-line-strong"
      >
        {SORT_FIELDS.map((field) => (
          <option key={field} value={field}>
            {FIELD_LABELS[field]}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => onChange(sort, current.next)}
        aria-label={`Sorted ${current.label.toLowerCase()}. Switch to ${next.label.toLowerCase()}.`}
        title={current.label}
        className="flex size-10 items-center justify-center rounded-card border border-line bg-surface text-muted transition-colors duration-150 hover:border-line-strong hover:text-ink"
      >
        <current.Icon size={16} />
      </button>
    </div>
  );
}
