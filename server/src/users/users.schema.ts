import { z } from 'zod';

import { LIMITS, normalizeSearch, searchTerms } from './users.limits.js';
import { SORT_FIELDS, SORT_ORDERS, type ListUsersInput, type UserFilters } from './users.types.js';

/**
 * HTTP query → typed input. This is the trust boundary: nothing below the controller ever sees a
 * raw query string, so the service and repository can assume their input is valid.
 */

/** Accepts `?x=a,b` and `?x=a&x=b`; trims, drops blanks and duplicates, caps the count. */
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

/** Empty string means "no bound" (an `<input>` that was cleared), not zero. */
const age = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.coerce
    .number({ error: 'Age must be a number' })
    .int({ error: 'Age must be a whole number' })
    .min(LIMITS.ageMin, { error: `Age must be at least ${LIMITS.ageMin}` })
    .max(LIMITS.ageMax, { error: `Age must be at most ${LIMITS.ageMax}` })
    .optional(),
);

const ageRangeIsOrdered = (values: { ageMin?: number | undefined; ageMax?: number | undefined }) =>
  values.ageMin === undefined || values.ageMax === undefined || values.ageMin <= values.ageMax;

const AGE_RANGE_ERROR = { error: 'ageMin must be less than or equal to ageMax', path: ['ageMin'] };

const filterFields = z.object({
  q: text,
  nationalities: list,
  hobbies: list,
  ageMin: age,
  ageMax: age,
});

export const filtersSchema = filterFields.refine(ageRangeIsOrdered, AGE_RANGE_ERROR);

export const usersQuerySchema = filterFields
  .extend({
    sort: z.enum(SORT_FIELDS).default('first_name'),
    order: z.enum(SORT_ORDERS).default('asc'),
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(LIMITS.maxPageSize)
      .default(LIMITS.defaultPageSize),
  })
  .refine(ageRangeIsOrdered, AGE_RANGE_ERROR);

// Compile-time proof that what the schemas produce is exactly what the service accepts.
type Extends<T extends U, U> = T;
export type _UsersQueryIsListInput = Extends<z.infer<typeof usersQuerySchema>, ListUsersInput>;
export type _FiltersQueryIsUserFilters = Extends<z.infer<typeof filtersSchema>, UserFilters>;
