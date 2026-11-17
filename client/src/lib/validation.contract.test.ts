import { describe, expect, it } from 'vitest';

import * as server from '../../../server/src/users/users.limits.ts';
import * as client from './validation.ts';

describe('client and server validation contract', () => {
  it('uses the same limits', () => {
    for (const key of Object.keys(client.LIMITS) as (keyof typeof client.LIMITS)[]) {
      expect(client.LIMITS[key], key).toBe(server.LIMITS[key]);
    }
  });

  it.each(['', '  a  ', 'a 　b', '​x﻿', 'José  Smith\t'])('normalises %j identically', (input) => {
    expect(client.normalizeSearch(input)).toBe(server.normalizeSearch(input));
  });
});
