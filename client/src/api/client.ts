import type { FacetsResponse, FilterState, UsersResponse } from './types.ts';

export const PAGE_SIZE = 50;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function filterParams(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);

  for (const value of filters.nationalities) params.append('nationalities', value);
  for (const value of filters.hobbies) params.append('hobbies', value);
  return params;
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { signal, headers: { accept: 'application/json' } });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('Could not reach the server. Check that the API is running.');
  }

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body: { error?: string }) => body.error)
      .catch(() => undefined);
    throw new ApiError(detail ?? `Request failed with status ${response.status}`, response.status);
  }

  return response.json() as Promise<T>;
}

export function fetchUsers(
  filters: FilterState,
  page: number,
  signal?: AbortSignal,
): Promise<UsersResponse> {
  const params = filterParams(filters);
  params.set('sort', filters.sort);
  params.set('order', filters.order);
  params.set('page', String(page));
  params.set('pageSize', String(PAGE_SIZE));
  return request<UsersResponse>(`/api/users?${params}`, signal);
}

export function fetchFacets(filters: FilterState, signal?: AbortSignal): Promise<FacetsResponse> {
  return request<FacetsResponse>(`/api/facets?${filterParams(filters)}`, signal);
}
