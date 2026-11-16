import { useEffect, useId, useRef, useState } from 'react';

import { useDebouncedValue } from '../hooks/useDebouncedValue.ts';
import { LIMITS, validateAgeRange, type AgeField } from '../lib/validation.ts';

interface AgeRangeFilterProps {
  ageMin: number | null;
  ageMax: number | null;
  onChange: (ageMin: number | null, ageMax: number | null) => void;
}

const SEPARATOR = '\u0000';

const toDraft = (value: number | null): string => (value === null ? '' : String(value));

/**
 * Two free-text inputs validated by our own rules rather than `type="number"`: a number input
 * reports "" for anything it cannot parse (1e5, --3, 12.), so invalid text would silently look
 * like "no bound" instead of being reported. Rules: whole number, 0–130, min ≤ max.
 *
 * - The URL only ever receives a valid range; while the inputs are invalid the list keeps
 *   showing the last valid one.
 * - Errors appear once typing pauses (the debounced value) or the field loses focus, never on
 *   the first keystroke, and are tied to their input with aria-invalid / aria-describedby.
 */
export function AgeRangeFilter({ ageMin, ageMax, onChange }: AgeRangeFilterProps) {
  const [minDraft, setMinDraft] = useState(toDraft(ageMin));
  const [maxDraft, setMaxDraft] = useState(toDraft(ageMax));
  const [touched, setTouched] = useState<Record<AgeField, boolean>>({ min: false, max: false });
  // Debounce the pair as one value: editing min then max quickly should apply one range, not
  // an intermediate one-sided range followed by the real one.
  const [debouncedMin = '', debouncedMax = ''] = useDebouncedValue(
    `${minDraft}${SEPARATOR}${maxDraft}`,
  ).split(SEPARATOR);
  const lastPushed = useRef({ min: ageMin, max: ageMax });
  const ids = { min: useId(), max: useId() };

  const settled = validateAgeRange(debouncedMin, debouncedMax);
  const isTyping = minDraft !== debouncedMin || maxDraft !== debouncedMax;
  const visibleError = (field: AgeField) =>
    touched[field] || !isTyping ? settled.errors[field] : undefined;

  useEffect(() => {
    if (!settled.valid) return;
    if (settled.min === lastPushed.current.min && settled.max === lastPushed.current.max) return;
    lastPushed.current = { min: settled.min, max: settled.max };
    onChange(settled.min, settled.max);
  }, [settled.valid, settled.min, settled.max, onChange]);

  // The URL changed from outside (a chip, "Clear all", Back): reflect it and reset errors.
  useEffect(() => {
    if (ageMin === lastPushed.current.min && ageMax === lastPushed.current.max) return;
    lastPushed.current = { min: ageMin, max: ageMax };
    setMinDraft(toDraft(ageMin));
    setMaxDraft(toDraft(ageMax));
    setTouched({ min: false, max: false });
  }, [ageMin, ageMax]);

  const field = (
    which: AgeField,
    label: string,
    draft: string,
    setDraft: (value: string) => void,
  ) => {
    const error = visibleError(which);
    return (
      <div className="flex min-w-0 flex-1 flex-col">
        <label htmlFor={`${ids[which]}-input`} className="sr-only">
          {label}
        </label>
        <input
          id={`${ids[which]}-input`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={which === 'min' ? 'Min' : 'Max'}
          value={draft}
          maxLength={3}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, [which]: true }))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? ids[which] : undefined}
          className={`h-9 w-full min-w-0 rounded-card border bg-surface px-2.5 text-sm text-ink placeholder:text-faint transition-colors duration-150 ${
            error
              ? 'border-danger focus:border-danger'
              : 'border-line hover:border-line-strong focus:border-accent'
          }`}
        />
      </div>
    );
  };

  const errors = (['min', 'max'] as const)
    .map((which) => ({ which, message: visibleError(which) }))
    .filter((entry): entry is { which: AgeField; message: string } => Boolean(entry.message));

  return (
    <section className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="label">Age</h2>
      </div>
      <p className="mt-1 px-1 text-xs text-faint">
        Inclusive range, {LIMITS.ageMin}–{LIMITS.ageMax} years.
      </p>

      <div className="mt-2.5 flex items-start gap-2 px-1">
        {field('min', 'Minimum age', minDraft, setMinDraft)}
        <span className="nums pt-2 text-xs text-faint" aria-hidden="true">
          –
        </span>
        {field('max', 'Maximum age', maxDraft, setMaxDraft)}
      </div>

      {errors.map(({ which, message }) => (
        <p key={which} id={ids[which]} role="alert" className="mt-1.5 px-1 text-xs text-danger">
          {message}
        </p>
      ))}
    </section>
  );
}
