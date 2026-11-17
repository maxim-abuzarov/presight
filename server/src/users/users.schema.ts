import { z } from 'zod';

import { LIMITS, normalizeSearch, searchTerms } from './users.limits.js';
import { SORT_FIELDS, SORT_ORDERS, type ListUsersInput, type UserFilters } from './users.types.js';

const list = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value === undefined) return [];
    const raw = Array.isArray(value) ? value : [value];
    const parsed = raw.flatMap((entry) => entry.split(',')).map((entry) => entry.trim());
    return [...new Set(parsed.filter(Boolean))];
  })
  .refine((values) => values.length <= LIMITS.maxFilterValues, {
    error: `Too many values (max ${LIMITS.maxFilterValues})`,
  });

const text = z
  .string()
  .optional()
  .transform((value) => normalizeSearch(value) || undefined)
  .refine((value) => value === undefined || value.length <= LIMITS.searchMaxLength, {
    error: `Search must be at most ${LIMITS.searchMaxLength} characters`,
  })
  .refine((value) => value === undefined || searchTerms(value).length <= LIMITS.searchMaxTerms, {
    error: `Search must be at most ${LIMITS.searchMaxTerms} words`,
  });

export const filtersSchema = z.object({
  q: text,
  nationalities: list,
  hobbies: list,
});

export const usersQuerySchema = filtersSchema.extend({
  sort: z.enum(SORT_FIELDS).default('first_name'),
  order: z.enum(SORT_ORDERS).default('asc'),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(LIMITS.maxPageSize).default(LIMITS.defaultPageSize),
});

type Extends<T extends U, U> = T;
export type _UsersQueryIsListInput = Extends<z.infer<typeof usersQuerySchema>, ListUsersInput>;
export type _FiltersQueryIsUserFilters = Extends<z.infer<typeof filtersSchema>, UserFilters>;
