import { createHash } from 'node:crypto';
import * as botttsNeutral from '@dicebear/bottts-neutral';
import { createAvatar } from '@dicebear/core';
import { Router } from 'express';

import { HttpError } from '../shared/http-error.js';

export const avatarsRouter: Router = Router();

const SEED = /^[\w.-]{1,100}$/;

/**
 * Avatars are generated here instead of hot-linked from api.dicebear.com. The page used to fire
 * ~20 requests at a third-party API on every scroll; if that host was slow, rate-limited (429)
 * or blocked by a corporate proxy, the network panel filled with failures that had nothing to do
 * with our code. Now the app has no runtime dependency outside its own origin, works offline,
 * and the CSP can say img-src 'self'.
 *
 * The SVG is a pure function of the seed, so it is cached for a year as immutable and gets a
 * strong ETag: each avatar is generated at most once per browser.
 */
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
