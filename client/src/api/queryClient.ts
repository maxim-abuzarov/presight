import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './client.ts';

const MAX_RETRIES = 2;

/**
 * Retry only what can succeed on a second try: network failures and 5xx. A 4xx means the
 * request itself is wrong, and repeating it would only delay the error message.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.isClientError) return false;
  return failureCount < MAX_RETRIES;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        // 500ms, 1s, … capped at 4s: long enough for a restarting server, short enough to feel live.
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4000),
        refetchOnWindowFocus: false,
        // The directory changes only on re-seed; a minute of reuse makes Back instant.
        staleTime: 60_000,
      },
    },
  });
}
