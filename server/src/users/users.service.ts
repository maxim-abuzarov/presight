import { LIMITS } from './users.limits.js';
import { countUsers, listUsers, topHobbies, topNationalities } from './users.repository.js';
import type { FacetsResponse, ListUsersInput, UserFilters, UsersResponse } from './users.types.js';

export function getUsers(input: ListUsersInput): UsersResponse {
  const total = countUsers(input);
  const offset = (input.page - 1) * input.pageSize;

  const data =
    offset >= total
      ? []
      : listUsers(input, {
          sort: input.sort,
          order: input.order,
          limit: input.pageSize,
          offset,
        });

  return {
    data,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
      hasMore: offset + data.length < total,
    },
  };
}

/**
 * Hobbies are AND: each selected hobby narrows the set, so the hobby facet is counted within the
 * full filter. Nationalities are OR: counting them within their own selection would leave only
 * the chosen countries and make "pick a second country" impossible, so that facet ignores its own
 * dimension while still honouring text, hobbies and age.
 */
export function getFacets(filters: UserFilters): FacetsResponse {
  return {
    hobbies: topHobbies(filters, LIMITS.facetLimit),
    nationalities: topNationalities({ ...filters, nationalities: [] }, LIMITS.facetLimit),
  };
}
