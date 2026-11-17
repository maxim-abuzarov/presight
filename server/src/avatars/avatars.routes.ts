import { createHash } from 'node:crypto';
import * as botttsNeutral from '@dicebear/bottts-neutral';
import { createAvatar } from '@dicebear/core';
import { Router } from 'express';

import { HttpError } from '../shared/http-error.js';

export const avatarsRouter: Router = Router();

const SEED = /^[\w.-]{1,100}$/;

avatarsRouter.get('/avatars/:seed.svg', (req, res) => {
  const { seed } = req.params;
  if (!SEED.test(seed)) throw HttpError.badRequest('Invalid avatar seed');

  const svg = createAvatar(botttsNeutral, { seed }).toString();
  res
    .type('image/svg+xml')
    .set('cache-control', 'public, max-age=31536000, immutable')
    .set('etag', `"${createHash('sha1').update(svg).digest('base64url')}"`)
    .send(svg);
});
