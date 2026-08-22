import { queryAll, queryOne } from '../db/connection.js';
import { buildFilterSql } from './users.filters.js';
import type { FacetValue, SortField, SortOrder, User, UserFilters } from './users.types.js';

const SORT_COLUMNS: Record<SortField, string> = {
  first_name: 'u.first_name_lc',
  last_name: 'u.last_name_lc',
  age: 'u.age',
  nationality: 'n.name',
};

type UserRow = Omit<User, 'hobbies'>;

export interface ListOptions {
  sort: SortField;
  order: SortOrder;
  limit: number;
  offset: number;
}

export function countUsers(filters: UserFilters): number {
  const { cte, params } = buildFilterSql(filters);
  return queryOne<{ total: number }>(`${cte} SELECT COUNT(*) AS total FROM matched`, params).total;
}

export function listUsers(filters: UserFilters, options: ListOptions): User[] {
  const { cte, params } = buildFilterSql(filters);
  const direction = options.order === 'desc' ? 'DESC' : 'ASC';

  const rows = queryAll<UserRow>(
    `${cte}
    SELECT u.id, u.avatar, u.first_name, u.last_name, u.age, n.name AS nationality
    FROM matched m
    JOIN users u ON u.id = m.id
    JOIN nationalities n ON n.id = u.nationality_id
    ORDER BY ${SORT_COLUMNS[options.sort]} ${direction}, u.id ASC
    LIMIT ? OFFSET ?`,
    [...params, options.limit, options.offset],
  );

  const hobbies = hobbiesByUserId(rows.map((row) => row.id));
  return rows.map((row) => ({ ...row, hobbies: hobbies.get(row.id) ?? [] }));
}

function hobbiesByUserId(userIds: number[]): Map<number, string[]> {
  const byUser = new Map<number, string[]>();
  if (userIds.length === 0) return byUser;

  const rows = queryAll<{ user_id: number; name: string }>(
    `SELECT uh.user_id, h.name
    FROM user_hobbies uh
    JOIN hobbies h ON h.id = uh.hobby_id
    WHERE uh.user_id IN (${userIds.map(() => '?').join(', ')})
    ORDER BY h.name ASC`,
    userIds,
  );

  for (const row of rows) {
    const list = byUser.get(row.user_id);
    if (list) list.push(row.name);
    else byUser.set(row.user_id, [row.name]);
  }
  return byUser;
}

export function topHobbies(filters: UserFilters, limit: number): FacetValue[] {
  const { cte, params } = buildFilterSql(filters);
  return queryAll<FacetValue>(
    `${cte}
    SELECT h.name AS value, COUNT(*) AS count
    FROM matched m
    JOIN user_hobbies uh ON uh.user_id = m.id
    JOIN hobbies h ON h.id = uh.hobby_id
    GROUP BY h.id
    ORDER BY count DESC, value ASC
    LIMIT ?`,
    [...params, limit],
  );
}

export function topNationalities(filters: UserFilters, limit: number): FacetValue[] {
  const { cte, params } = buildFilterSql(filters);
  return queryAll<FacetValue>(
    `${cte}
    SELECT n.name AS value, COUNT(*) AS count
    FROM matched m
    JOIN nationalities n ON n.id = m.nationality_id
    GROUP BY n.id
    ORDER BY count DESC, value ASC
    LIMIT ?`,
    [...params, limit],
  );
}
