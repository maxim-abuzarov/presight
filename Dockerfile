# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=24.15.0

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM deps AS build
COPY client client
COPY server server
RUN npm run build

FROM node:${NODE_VERSION}-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --workspace app-server --no-audit --no-fund

FROM node:${NODE_VERSION}-alpine AS runtime

LABEL org.opencontainers.image.title="people-directory" \
      org.opencontainers.image.description="Searchable, filterable people directory (React + Express + SQLite)" \
      org.opencontainers.image.source="https://github.com/maxim-abuzarov/presight"

ENV NODE_ENV=production \
    PORT=7777 \
    DB_PATH=/data/presight.db \
    LOG_LEVEL=info
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/package.json ./package.json
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /data && chown node:node /data
VOLUME ["/data"]

USER node
WORKDIR /app/server
EXPOSE 7777

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
