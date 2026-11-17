import { Router } from 'express';

import { apiRateLimit } from '../shared/rate-limit.js';
import { facetsHandler, usersHandler } from './users.controller.js';

export const usersRouter: Router = Router();

usersRouter.get('/users', apiRateLimit, usersHandler);
usersRouter.get('/facets', apiRateLimit, facetsHandler);
