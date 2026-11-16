import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import { useDebouncedValue } from '../hooks/useDebouncedValue.ts';
import { useSearchHotkey } from '../hooks/useSearchHotkey.ts';
import { LIMITS, normalizeSearch, searchError } from '../lib/validation.ts';
import { CloseIcon, SearchIcon } from './Icon.tsx';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * The input keeps exactly what the user typed (a trailing space while typing a second word must
 * not be eaten), but what leaves the component is always normalised: trimmed, whitespace runs
 * collapsed. So "  anna   smith " and "anna smith" are one search, one URL and one cache entry,
 * and a whitespace-only box means no search. Enter applies immediately, skipping the debounce.
 */
export function SearchField({ value, onChange }: SearchFieldProps) {
  const [draft, setDraft] = useState(value);
  const debounced = useDebouncedValue(draft);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  const lastPushed = useRef(value);
  const error = searchError(debounced);

  const push = (raw: string) => {
    if (searchError(raw)) return;
    const normalized = normalizeSearch(raw);
    if (normalized === lastPushed.current) return;
    lastPushed.current = normalized;
    onChange(normalized);
  };

  useEffect(() => {
    push(debounced);
    // `push` is recreated each render; only a new debounced value should trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // The URL changed from outside (Back button, "Clear all", a chip): show the new value.
  useEffect(() => {
    if (value === lastPushed.current) return;
    lastPushed.current = value;
    setDraft(value);
  }, [value]);

  useSearchHotkey(inputRef);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    push(draft);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && draft) {
      event.preventDefault();
      setDraft('');
    }
  };

  return (
    <form role="search" onSubmit={onSubmit} className="relative min-w-48 flex-1">
      <SearchIcon
        size={16}
        className="pointer-events-none absolute left-3 top-5 -translate-y-1/2 text-faint"
      />
      <input
        ref={inputRef}
        type="search"
        name="q"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Search by name"
        aria-label="Search people by first or last name"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        maxLength={LIMITS.searchMaxLength}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        className={`h-10 w-full rounded-card border bg-surface pl-9 pr-9 text-sm text-ink placeholder:text-faint transition-colors duration-150 [&::-webkit-search-cancel-button]:appearance-none ${
          error
            ? 'border-danger focus:border-danger'
            : 'border-line hover:border-line-strong focus:border-accent'
        }`}
      />
      {!draft && (
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-5 hidden -translate-y-1/2 rounded-sm border border-line px-1.5 py-0.5 font-sans text-xs text-faint sm:block"
        >
          /
        </kbd>
      )}
      {draft && (
        <button
          type="button"
          onClick={() => {
            setDraft('');
            push('');
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          className="absolute right-2 top-5 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-faint transition-colors duration-150 hover:bg-sunk hover:text-ink"
        >
          <CloseIcon size={14} />
        </button>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 px-1 text-xs text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
