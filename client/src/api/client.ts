import type { FacetsResponse, FilterState, UsersResponse } from './types.ts';

export const PAGE_SIZE = 50;

/**
 * Every failure the UI can show is an ApiError: a network failure (status undefined), a 4xx
 * (the request was wrong — retrying will not help) or a 5xx (the server failed — it might).
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isClientError(): boolean {
    return this.status !== undefined && this.status >= 400 && this.status < 500;
  }
}

function filterParams(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  for (const value of filters.nationalities) params.append('nationalities', value);
  for (const value of filters.hobbies) params.append('hobbies', value);
  if (filters.ageMin !== null) params.set('ageMin', String(filters.ageMin));
  if (filters.ageMax !== null) params.set('ageMax', String(filters.ageMax));
  return params;
}

interface ErrorBody {
  error?: string;
  requestId?: string;
}

export async function request<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { headers: { accept: 'application/json' } });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.');
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorBody;
    const requestId = body.requestId ?? response.headers.get('x-request-id') ?? undefined;
    const message =
      response.status >= 500
        ? 'The server had a problem loading records.'
        : (body.error ?? `Request failed with status ${response.status}.`);
    throw new ApiError(message, response.status, requestId);
  }

  return response.json() as Promise<T>;
}

export function fetchUsers(filters: FilterState, page: number): Promise<UsersResponse> {
  const params = filterParams(filters);
  params.set('sort', filters.sort);
  params.set('order', filters.order);
  params.set('page', String(page));
  params.set('pageSize', String(PAGE_SIZE));
  return request<UsersResponse>(`/api/users?${params}`);
}

export function fetchFacets(filters: FilterState): Promise<FacetsResponse> {
  return request<FacetsResponse>(`/api/facets?${filterParams(filters)}`);
}
