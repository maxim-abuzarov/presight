import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { pinoHttp } from 'pino-http';

import { logger } from './logger.js';

const REQUEST_ID_HEADER = 'x-request-id';
const SAFE_REQUEST_ID = /^[\w.-]{1,128}$/;

/**
 * Logs one line per request when it finishes, with method, url, status and responseTime, and
 * gives every request an id. The id is taken from an upstream proxy's `X-Request-Id` when it is
 * well formed (so one id follows a request across services) and generated otherwise. It is
 * echoed back in the response header and in every 500 body, so a user's bug report — "it said
 * requestId 7f3c…" — leads straight to the matching log line.
 */
export const requestLogger = pinoHttp({
  logger,
  genReqId(req: IncomingMessage, res: ServerResponse) {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const id =
      typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader(REQUEST_ID_HEADER, id);
    return id;
  },
  customLogLevel(req, res, error) {
    if (error || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    // A scroll loads dozens of avatars; at info they would bury the API calls that matter.
    if (req.url?.startsWith('/api/avatars/')) return 'debug';
    return 'info';
  },
  // Health probes run every few seconds; at info level they would drown the useful lines.
  autoLogging: { ignore: (req) => req.url === '/api/health' },
  serializers: {
    req: (req: { id: string; method: string; url: string }) => ({
      id: req.id,
      method: req.method,
      url: req.url,
    }),
    res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
  },
});
