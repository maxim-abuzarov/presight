import type { SqlParam } from '../db/connection.js';
import { searchTerms } from './users.limits.js';
import type { UserFilters } from './users.types.js';

export interface FilterSql {
  cte: string;
  params: SqlParam[];
}

const placeholders = (count: number): string => Array.from({ length: count }, () => '?').join(', ');

export function buildFilterSql(filters: UserFilters): FilterSql {
  const conditions: string[] = [];
  const params: SqlParam[] = [];

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
