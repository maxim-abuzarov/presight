/**
 * Input limits of the public API. They live in a module with no imports so the client's
 * contract test can import this file directly and fail the build if the two sides drift.
 */
export const LIMITS = {
  /** Longest accepted search string, after normalisation. */
  searchMaxLength: 120,
  /** Most whitespace-separated words in a search; each adds two LIKE predicates. */
  searchMaxTerms: 10,
  /** Most values in one list filter; keeps the SQL well under SQLite's variable limit. */
  maxFilterValues: 50,
  ageMin: 0,
  ageMax: 130,
  defaultPageSize: 50,
  maxPageSize: 100,
  facetLimit: 20,
} as const;

/**
 * The one definition of "what the user typed": Unicode NFC, zero-width characters removed,
 * every run of whitespace (tabs, non-breaking and ideographic spaces included) collapsed to a
 * single space, then trimmed. Whitespace-only input means "no text filter".
 *
 * The client applies the same function before writing the URL, so `?q=` is always canonical;
 * the server applies it again because it must not trust the client.
 */
export function normalizeSearch(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .normalize('NFC')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function searchTerms(normalized: string): string[] {
  return normalized === '' ? [] : normalized.toLowerCase().split(' ');
}
