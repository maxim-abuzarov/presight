import type { Request, Response } from 'express';
import type { z, ZodTypeAny } from 'zod';

import { HttpError } from '../shared/http-error.js';
import { getFacets, getUsers } from './users.service.js';
import { filtersSchema, usersQuerySchema } from './users.schema.js';

function parseQuery<S extends ZodTypeAny>(schema: S, req: Request): z.infer<S> {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    throw HttpError.badRequest('Invalid query parameters', result.error.flatten().fieldErrors);
  }
  return result.data;
}

export function usersHandler(req: Request, res: Response): void {
  res.json(getUsers(parseQuery(usersQuerySchema, req)));
}

export function facetsHandler(req: Request, res: Response): void {
  res.json(getFacets(parseQuery(filtersSchema, req)));
}
