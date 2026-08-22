import { config } from '../config.js';
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

export function getFacets(filters: UserFilters): FacetsResponse {
  return {
    hobbies: topHobbies(filters, config.facetLimit),
    nationalities: topNationalities({ ...filters, nationalities: [] }, config.facetLimit),
  };
}
