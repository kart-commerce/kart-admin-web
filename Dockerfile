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
RUN npm ci

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
CMD ["node", "dist/kart-admin-web/server/server.mjs"]
