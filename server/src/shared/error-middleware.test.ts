import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { NextFunction, Request, Response } from 'express';

import { errorHandler } from './error-middleware.js';
import { HttpError } from './http-error.js';

function fakeResponse() {
  const sent: { status?: number; body?: unknown } = {};
  const res = {
    status(code: number) {
      sent.status = code;
      return res;
    },
    json(body: unknown) {
      sent.body = body;
      return res;
    },
  };
  return { res: res as unknown as Response, sent };
}

function fakeRequest() {
  const logged: unknown[] = [];
  const req = { id: 'req-1', log: { error: (...args: unknown[]) => logged.push(args) } };
  return { req: req as unknown as Request, logged };
}

const next: NextFunction = () => undefined;

describe('errorHandler', () => {
  it('returns an HttpError as-is, with its status and details', () => {
    const { res, sent } = fakeResponse();
    errorHandler(
      HttpError.badRequest('Invalid', { q: ['too long'] }),
      fakeRequest().req,
      res,
      next,
    );
    assert.equal(sent.status, 400);
    assert.deepEqual(sent.body, { error: 'Invalid', details: { q: ['too long'] } });
  });

  it('hides an unexpected error behind a generic 500 with the request id, and logs it', () => {
    const { res, sent } = fakeResponse();
    const { req, logged } = fakeRequest();
    errorHandler(new Error('SQLITE_CORRUPT: secret internals'), req, res, next);

    assert.equal(sent.status, 500);
    assert.deepEqual(sent.body, { error: 'Internal server error', requestId: 'req-1' });
    assert.equal(logged.length, 1, 'the real error must reach the log');
    assert.doesNotMatch(JSON.stringify(sent.body), /SQLITE/, 'internals must not reach the client');
  });

  it('maps a client error thrown by a parser to its own 4xx', () => {
    const { res, sent } = fakeResponse();
    errorHandler(
      Object.assign(new Error('bad json'), { status: 400 }),
      fakeRequest().req,
      res,
      next,
    );
    assert.equal(sent.status, 400);
  });
});
