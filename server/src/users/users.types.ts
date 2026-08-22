export const SORT_FIELDS = ['first_name', 'last_name', 'age', 'nationality'] as const;
export const SORT_ORDERS = ['asc', 'desc'] as const;

export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

export interface UserFilters {
  q?: string | undefined;
  nationalities: string[];
  hobbies: string[];
}

export interface ListUsersInput extends UserFilters {
  sort: SortField;
  order: SortOrder;
  page: number;
  pageSize: number;
}

export interface User {
  id: number;
  avatar: string;
  first_name: string;
  last_name: string;
  age: number;
  nationality: string;
  hobbies: string[];
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface UsersResponse {
  data: User[];
  pagination: Pagination;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface FacetsResponse {
  hobbies: FacetValue[];
  nationalities: FacetValue[];
}
