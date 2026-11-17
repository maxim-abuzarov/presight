export const LIMITS = {
  searchMaxLength: 120,
  searchMaxTerms: 10,
  maxFilterValues: 50,
  defaultPageSize: 50,
  maxPageSize: 100,
  facetLimit: 20,
} as const;

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
