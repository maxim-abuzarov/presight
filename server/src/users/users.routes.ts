import { Router } from 'express';

import { apiRateLimit } from '../shared/rate-limit.js';
import { facetsHandler, usersHandler } from './users.controller.js';

export const usersRouter: Router = Router();

// The limiter is attached per route, not to the router with app.use: router-level middleware
// would also run for every later /api route (avatars), and a page of avatars would use up the
// budget meant for data queries.
usersRouter.get('/users', apiRateLimit, usersHandler);
usersRouter.get('/facets', apiRateLimit, facetsHandler);
