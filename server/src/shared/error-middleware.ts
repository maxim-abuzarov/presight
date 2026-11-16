import type { NextFunction, Request, Response } from 'express';

import { HttpError } from './http-error.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(HttpError.notFound(`No route for ${req.method} ${req.originalUrl.split('?')[0]}`));
}

/**
 * The single place an error becomes an HTTP response.
 *
 * - An HttpError is an expected outcome (bad input, unknown route): its message is safe to show,
 *   and pino-http already logs the request at warn level.
 * - Anything else is a bug or an infrastructure failure. The stack trace goes to the log with the
 *   request id; the client gets a generic message plus that id — never the stack, never SQL.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, details: error.details });
    return;
  }

  // express.json / body parsers set `status` on malformed input; treat those as client errors.
  const status = (error as { status?: unknown })?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).json({ error: 'Malformed request' });
    return;
  }

  req.log.error({ err: error }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error', requestId: req.id });
}
