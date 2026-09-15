# syntax=docker/dockerfile:1
#
# Dockerfile for the "ingress" service 
#
# Build context MUST be the repo root — npm workspaces needs every
# workspace's package.json to resolve its packages correctly:
#
#   docker build -f _apps/ingress/Dockerfile --target production -t ingress .
#
# Not meant to be built by hand day-to-day — see docker-compose.yml / docker-compose.override.yml at the repo root, which set the right target (dev vs production) and env vars for you.

ARG NODE_VERSION=22-alpine

# deps
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY . .
RUN npm ci

# build: compile every workspace (building-blocks + all apps)
FROM deps AS build
RUN npm run build

# dev: run TS directly via tsx watch; compose mounts live
FROM deps AS dev
WORKDIR /app/_apps/ingress
ENV NODE_ENV=development
EXPOSE 5000
CMD ["npx", "tsx", "watch", "src/Bootstrap.ts"]

# production: compiled JS, no live-reload 
# Note: this still carries the full monorepo's node_modules (incl.
# devDependencies) and every workspace's compiled dist, not just ingress
FROM build AS production
ENV NODE_ENV=production
WORKDIR /app/_apps/ingress
EXPOSE 5000
CMD ["node", "dist/Bootstrap.js"]
