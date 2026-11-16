# syntax=docker/dockerfile:1.7
#
# Multi-stage build. Each FROM starts a clean filesystem; only what is explicitly COPY'd from an
# earlier stage reaches the final image. The runtime image therefore contains compiled JS, the
# built client and production dependencies — no TypeScript, no Vite, no source, no npm cache.
#
# Layer order follows "least frequently changed first": package manifests are copied and
# installed before the source, so editing a .ts file reuses the cached `npm ci` layer.

ARG NODE_VERSION=24.15.0

# ---- 1. all dependencies (dev included): needed to compile ------------------------------
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# ---- 2. build: compile the server (tsc) and bundle the client (vite) ---------------------
FROM deps AS build
COPY client client
COPY server server
RUN npm run build

# ---- 3. production dependencies of the server workspace only -----------------------------
# React, Vite, Tailwind and the test tooling are not installed here at all.
FROM node:${NODE_VERSION}-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --workspace app-server --no-audit --no-fund

# ---- 4. runtime --------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime

LABEL org.opencontainers.image.title="people-directory" \
      org.opencontainers.image.description="Searchable, filterable people directory (React + Express + SQLite)" \
      org.opencontainers.image.source="https://github.com/maxim-abuzarov/presight"

ENV NODE_ENV=production \
    PORT=7777 \
    DB_PATH=/data/presight.db \
    LOG_LEVEL=info
WORKDIR /app

# Copied files stay owned by root, so the app (running as `node`) can read its code but not
# change it. No `chown -R` here: it would rewrite every file into an extra, duplicate layer.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/package.json ./package.json
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# The database lives on a volume mounted at /data; the node user (uid 1000) must own it.
RUN mkdir -p /data && chown node:node /data
VOLUME ["/data"]

# Never run as root: a compromised process would otherwise be root inside the container.
USER node
WORKDIR /app/server
EXPOSE 7777

# Readiness probe: /api/health returns 200 only when the database answers a real query.
# Uses Node's built-in fetch, so the image needs no curl/wget.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# ENTRYPOINT prepares the database, then `exec`s CMD so node becomes PID 1 and receives
# SIGTERM directly from `docker stop` (and shuts down gracefully).
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
