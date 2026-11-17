import type { NextFunction, Request, Response } from 'express';

import { HttpError } from './http-error.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(HttpError.notFound(`No route for ${req.method} ${req.originalUrl.split('?')[0]}`));
}

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

  const status = (error as { status?: unknown })?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).json({ error: 'Malformed request' });
    return;
  }

  req.log.error({ err: error }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error', requestId: req.id });
}
