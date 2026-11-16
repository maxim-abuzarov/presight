/**
 * Client-side validation rules. They mirror the server's (server/src/users/users.limits.ts) so
 * the user is told about a problem as they type instead of getting a 400 from the API; the
 * server still validates everything, because a client can always be bypassed. A contract test
 * (validation.contract.test.ts) imports the server's file and fails if the two drift apart.
 */
export const LIMITS = {
  searchMaxLength: 120,
  searchMaxTerms: 10,
  maxFilterValues: 50,
  ageMin: 0,
  ageMax: 130,
} as const;

/**
 * NFC, zero-width characters removed, every whitespace run (tabs, NBSP, ideographic space)
 * collapsed to one space, trimmed. Identical to the server's normalizeSearch.
 */
export function normalizeSearch(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .normalize('NFC')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function searchError(raw: string): string | null {
  const normalized = normalizeSearch(raw);
  if (normalized.length > LIMITS.searchMaxLength) {
    return `Use at most ${LIMITS.searchMaxLength} characters.`;
  }
  if (normalized !== '' && normalized.split(' ').length > LIMITS.searchMaxTerms) {
    return `Use at most ${LIMITS.searchMaxTerms} words.`;
  }
  return null;
}

export type AgeField = 'min' | 'max';

export interface AgeRangeResult {
  /** Parsed values; null means "no bound". Only meaningful when `valid` is true. */
  min: number | null;
  max: number | null;
  errors: Partial<Record<AgeField, string>>;
  valid: boolean;
}

function parseAge(draft: string, label: string): { value: number | null; error?: string } {
  const trimmed = draft.trim();
  if (trimmed === '') return { value: null };
  if (!/^\d+$/.test(trimmed)) return { value: null, error: `${label} must be a whole number.` };

  const value = Number(trimmed);
  if (value < LIMITS.ageMin || value > LIMITS.ageMax) {
    return {
      value: null,
      error: `${label} must be between ${LIMITS.ageMin} and ${LIMITS.ageMax}.`,
    };
  }
  return { value };
}

/** Validates the two raw text inputs of the age filter, field by field and as a pair. */
export function validateAgeRange(minDraft: string, maxDraft: string): AgeRangeResult {
  const min = parseAge(minDraft, 'Minimum age');
  const max = parseAge(maxDraft, 'Maximum age');
  const errors: AgeRangeResult['errors'] = {};
  if (min.error) errors.min = min.error;
  if (max.error) errors.max = max.error;

  if (
    !errors.min &&
    !errors.max &&
    min.value !== null &&
    max.value !== null &&
    min.value > max.value
  ) {
    errors.max = 'Maximum age must be greater than or equal to minimum age.';
  }

  return {
    min: min.value,
    max: max.value,
    errors,
    valid: !errors.min && !errors.max,
  };
}
