import type { SqlParam } from '../db/connection.js';
import { searchTerms } from './users.limits.js';
import type { UserFilters } from './users.types.js';

export interface FilterSql {
  cte: string;
  params: SqlParam[];
}

const placeholders = (count: number): string => Array.from({ length: count }, () => '?').join(', ');

/**
 * The single definition of "which users are in scope". It returns one CTE, `matched`, and every
 * query — the count, the page, both facet counts — is written as `${cte} SELECT … FROM matched`.
 * Because they share one WHERE clause they cannot disagree: a facet that says "Chess 41" always
 * yields 41 rows when selected.
 *
 * Every value is a bound parameter (`?`). Only fixed SQL fragments from this file are
 * concatenated, so user input can never change the shape of the query.
 */
export function buildFilterSql(filters: UserFilters): FilterSql {
  const conditions: string[] = [];
  const params: SqlParam[] = [];

  // Every word must appear in the first OR last name, so "smith anna" and "anna smith" both work
  // and each extra word narrows the result.
  for (const term of searchTerms(filters.q ?? '')) {
    const pattern = `%${escapeLike(term)}%`;
    conditions.push(`(u.first_name_lc LIKE ? ESCAPE '\\' OR u.last_name_lc LIKE ? ESCAPE '\\')`);
    params.push(pattern, pattern);
  }

  if (filters.nationalities.length > 0) {
    conditions.push(
      `u.nationality_id IN (SELECT id FROM nationalities WHERE name IN (${placeholders(filters.nationalities.length)}))`,
    );
    params.push(...filters.nationalities);
  }

  // AND semantics: the user must have every selected hobby. Relational division — keep the users
  // whose matching rows cover all N selected hobbies.
  if (filters.hobbies.length > 0) {
    conditions.push(
      `u.id IN (
        SELECT uh.user_id
        FROM user_hobbies uh
        JOIN hobbies h ON h.id = uh.hobby_id
        WHERE h.name IN (${placeholders(filters.hobbies.length)})
        GROUP BY uh.user_id
        HAVING COUNT(DISTINCT uh.hobby_id) = ?
      )`,
    );
    params.push(...filters.hobbies, filters.hobbies.length);
  }

  if (filters.ageMin !== undefined) {
    conditions.push(`u.age >= ?`);
    params.push(filters.ageMin);
  }

  if (filters.ageMax !== undefined) {
    conditions.push(`u.age <= ?`);
    params.push(filters.ageMax);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join('\n    AND ')}` : '';

  return {
    cte: `WITH matched AS (
  SELECT u.id, u.nationality_id
  FROM users u
  ${where}
)`,
    params,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
