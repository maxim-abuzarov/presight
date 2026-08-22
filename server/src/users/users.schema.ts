import { z } from 'zod';

import { config } from '../config.js';
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
  .refine((values) => values.length <= config.maxFilterValues, {
    message: `Too many values (max ${config.maxFilterValues})`,
  });

const text = z
  .string()
  .max(120)
  .optional()
  .transform((value) => value?.trim() || undefined);

export const filtersSchema = z.object({
  q: text,
  nationalities: list,
  hobbies: list,
});

export const usersQuerySchema = filtersSchema.extend({
  sort: z.enum(SORT_FIELDS).default('first_name'),
  order: z.enum(SORT_ORDERS).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(config.maxPageSize).default(config.defaultPageSize),
});

type Extends<T extends U, U> = T;
type _UsersQueryIsListInput = Extends<z.infer<typeof usersQuerySchema>, ListUsersInput>;
type _FiltersQueryIsUserFilters = Extends<z.infer<typeof filtersSchema>, UserFilters>;
