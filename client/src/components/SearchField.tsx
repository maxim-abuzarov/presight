import { useEffect, useRef, useState } from 'react';

import { useDebouncedValue } from '../hooks/useDebouncedValue.ts';
import { useSearchHotkey } from '../hooks/useSearchHotkey.ts';
import { CloseIcon, SearchIcon } from './Icon.tsx';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchField({ value, onChange }: SearchFieldProps) {
  const [draft, setDraft] = useState(value);
  const debounced = useDebouncedValue(draft);
  const inputRef = useRef<HTMLInputElement>(null);

  const lastPushed = useRef(value);

  useEffect(() => {
    if (debounced === lastPushed.current) return;
    lastPushed.current = debounced;
    onChange(debounced);
  }, [debounced, onChange]);

  useEffect(() => {
    if (value === lastPushed.current) return;
    lastPushed.current = value;
    setDraft(value);
  }, [value]);

  useSearchHotkey(inputRef);

  return (
    <div className="relative min-w-48 flex-1">
      <SearchIcon
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
      />
      <input
        ref={inputRef}
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Search by name"
        aria-label="Search people by first or last name"
        autoComplete="off"
        spellCheck={false}
        className="h-10 w-full rounded-card border border-line bg-surface pl-9 pr-9 text-sm text-ink placeholder:text-faint transition-colors duration-150 hover:border-line-strong focus:border-accent [&::-webkit-search-cancel-button]:appearance-none"
      />
      {!draft && (
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-sm border border-line px-1.5 py-0.5 font-sans text-xs text-faint sm:block"
        >
          /
        </kbd>
      )}
      {draft && (
        <button
          type="button"
          onClick={() => setDraft('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-faint transition-colors duration-150 hover:bg-sunk hover:text-ink"
        >
          <CloseIcon size={14} />
        </button>
      )}
    </div>
  );
}
