#!/bin/sh
set -e

if [ "${SEED_ON_START}" = "always" ]; then
  node dist/index.js seed
else
  node dist/index.js seed-if-empty
fi

exec "$@"
