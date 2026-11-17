export const LIMITS = {
  searchMaxLength: 120,
  searchMaxTerms: 10,
  maxFilterValues: 50,
} as const;

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
