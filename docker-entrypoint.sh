#!/bin/sh
# Runs before the server on every container start.
#   - Applies migrations and seeds the database on first boot (empty volume).
#   - On later boots the data already exists, so it only migrates and skips seeding.
#   - SEED_ON_START=always forces a fresh re-seed (wipes the volume's data).
# `set -e` aborts the start if seeding fails, so a broken database never serves traffic.
set -e

if [ "${SEED_ON_START}" = "always" ]; then
  node dist/index.js seed
else
  node dist/index.js seed-if-empty
fi

# Replace this shell with the CMD (node). Without exec, sh would be PID 1 and would not forward
# SIGTERM, so `docker stop` would wait 10s and then SIGKILL the app mid-request.
exec "$@"
