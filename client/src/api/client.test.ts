import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, request } from './client.ts';
import { shouldRetry } from './queryClient.ts';

const respond = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    }),
  );

afterEach(() => vi.restoreAllMocks());

describe('request', () => {
  it('returns the parsed body on success', async () => {
    respond(200, { ok: 1 });
    await expect(request('/api/x')).resolves.toEqual({ ok: 1 });
  });

  it('surfaces the server message for a 4xx', async () => {
    respond(400, { error: 'Invalid query parameters' });
    await expect(request('/api/x')).rejects.toMatchObject({
      message: 'Invalid query parameters',
      status: 400,
      isClientError: true,
    });
  });

  it('hides 5xx internals but keeps the request id for support', async () => {
    respond(500, { error: 'Internal server error', requestId: 'abc-123' });
    const error = await request('/api/x').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 500, requestId: 'abc-123', isClientError: false });
  });

  it('falls back to the x-request-id header when the body has none', async () => {
    respond(502, 'not json', { 'x-request-id': 'hdr-9' });
    await expect(request('/api/x')).rejects.toMatchObject({ requestId: 'hdr-9' });
  });

  it('reports a network failure without a status', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(request('/api/x')).rejects.toMatchObject({
      status: undefined,
      message: expect.stringMatching(/could not reach the server/i),
    });
  });
});

describe('shouldRetry', () => {
  it('never retries a client error', () => {
    expect(shouldRetry(0, new ApiError('bad', 400))).toBe(false);
  });

  it('retries server and network errors up to twice', () => {
    expect(shouldRetry(0, new ApiError('down', 503))).toBe(true);
    expect(shouldRetry(1, new ApiError('offline'))).toBe(true);
    expect(shouldRetry(2, new ApiError('offline'))).toBe(false);
  });
});
