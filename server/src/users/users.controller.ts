import type { Request, Response } from 'express';
import { z } from 'zod';

import { HttpError } from '../shared/http-error.js';
import { filtersSchema, usersQuerySchema } from './users.schema.js';
import { getFacets, getUsers } from './users.service.js';

/**
 * Controllers translate HTTP to function calls and back — and nothing else. They know about
 * Request/Response and zod; the service below them knows neither, which is why it is tested by
 * calling a function rather than standing up a server.
 */
function parseQuery<S extends z.ZodType>(schema: S, req: Request): z.output<S> {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    throw HttpError.badRequest(
      'Invalid query parameters',
      z.flattenError(result.error).fieldErrors,
    );
  }
  return result.data;
}

export function usersHandler(req: Request, res: Response): void {
  res.json(getUsers(parseQuery(usersQuerySchema, req)));
}

export function facetsHandler(req: Request, res: Response): void {
  res.json(getFacets(parseQuery(filtersSchema, req)));
}
