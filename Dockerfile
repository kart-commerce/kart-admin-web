# syntax=docker/dockerfile:1

# Stage 1: install deps + build the Angular browser bundle and the BFF server bundle.
FROM node:22-alpine AS build
WORKDIR /app

# Separate dependency-install layer from source copy so `npm ci` is cached
# across builds when only application source changes (kart-conventions.md /
# architecture.md "Layer Caching" convention, mirrored from kart-web's own
# multi-stage Dockerfile).
COPY package.json package-lock.json ./
# vendor/ holds the design-system package tarball (design-system.md) — npm ci
# needs the actual file present at install time, not just the manifests
# referencing it.
COPY vendor/ ./vendor/
# Cache mount persists npm's downloaded-tarball cache across builds (and across kart-web's build,
# which mounts the same id) independently of the layer cache above, so even a package-lock.json
# change that busts that layer skips re-downloading packages already fetched by a previous build.
RUN --mount=type=cache,target=/root/.npm,id=npm-cache \
    npm ci

COPY . .
RUN npm run build

# Stage 2: minimal runtime image — the static browser build + BFF server, no
# Angular SSR runtime (architecture.md §2 — this app is CSR-only).
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/dist/kart-admin-web ./dist/kart-admin-web
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 4000
# --env-file-if-exists is a no-op when no .env is mounted (the normal case — real
# deployments inject env vars directly), but picks one up for local docker-compose use.
CMD ["node", "--env-file-if-exists=.env", "dist/kart-admin-web/server/server.mjs"]
