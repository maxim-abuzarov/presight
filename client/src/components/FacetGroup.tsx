import type { FacetValue } from '../api/types.ts';
import { CheckIcon } from './Icon.tsx';

interface FacetGroupProps {
  title: string;
  hint: string;
  facets: FacetValue[];
  selected: string[];
  loading: boolean;
  onToggle: (value: string) => void;
}

export function FacetGroup({ title, hint, facets, selected, loading, onToggle }: FacetGroupProps) {
  const selectedSet = new Set(selected);

  const missing = selected.filter((value) => !facets.some((facet) => facet.value === value));
  const rows: FacetValue[] = [...missing.map((value) => ({ value, count: 0 })), ...facets];
  const max = Math.max(1, ...facets.map((facet) => facet.count));

  return (
    <section className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="label">{title}</h2>
        {selected.length > 0 && (
          <span className="nums text-xs font-semibold text-accent">{selected.length} selected</span>
        )}
      </div>
      <p className="mt-1 px-1 text-xs text-faint">{hint}</p>

      <ul className="mt-2.5 flex flex-col">
        {loading && rows.length === 0
          ? Array.from({ length: 8 }, (_, index) => (
              <li key={index} className="px-1 py-2" aria-hidden="true">
                <div
                  className="skeleton h-3.5 rounded-sm"
                  style={{ width: `${88 - index * 6}%` }}
                />
              </li>
            ))
          : rows.map((facet) => {
              const isSelected = selectedSet.has(facet.value);
              return (
                <li key={facet.value}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onToggle(facet.value)}
                    className={`group relative isolate flex w-full items-center gap-2.5 overflow-hidden rounded-sm px-1.5 py-2 text-left transition-colors duration-150 ${
                      isSelected
                        ? 'bg-accent-weak text-ink'
                        : 'text-muted hover:bg-sunk/60 hover:text-ink'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute bottom-[2px] left-1.5 z-0 h-0.5 rounded-full bg-accent/35 transition-[width] duration-500 ease-out"
                      style={{ width: `calc(${(facet.count / max) * 92}% )` }}
                    />
                    <span
                      aria-hidden="true"
                      className={`relative z-10 flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors duration-150 ${
                        isSelected
                          ? 'border-accent bg-accent text-accent-ink'
                          : 'border-line-strong bg-surface group-hover:border-muted'
                      }`}
                    >
                      {isSelected && <CheckIcon size={11} />}
                    </span>
                    <span
                      className={`relative z-10 flex-1 truncate text-sm ${isSelected ? 'font-medium' : ''}`}
                    >
                      {facet.value}
                    </span>
                    <span className="nums relative z-10 shrink-0 text-xs text-faint">
                      {facet.count.toLocaleString()}
                    </span>
                  </button>
                </li>
              );
            })}

        {!loading && rows.length === 0 && (
          <li className="px-1 py-2 text-xs text-faint">Nothing to filter by in this result set.</li>
        )}
      </ul>
    </section>
  );
}
