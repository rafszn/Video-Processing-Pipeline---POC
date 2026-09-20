# syntax=docker/dockerfile:1

# The "media" service has TWO runnable processes from one codebase:
# HTTP API (src/Bootstrap.ts) 
# RabbitMQ worker (src/worker.ts)

# This Dockerfile produces four targets instead of two: 
# api-dev,
# worker-dev, 
# api-production, 
# worker-production.

# Build context MUST be the repo root: npm workspaces needs every
# workspace's package.json to resolve @core/building-blocks correctly:

#   docker build -f _apps/media/Dockerfile --target api-production -t media-api .
#   docker build -f _apps/media/Dockerfile --target worker-production -t media-worker .

# Not meant to be built by hand day-to-day — see docker-compose.yml / docker-compose.override.yml at the repo root, which set the right target (dev vs production, api vs worker) and env vars

ARG NODE_VERSION=22-alpine

# deps: install once, reused by every stage
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY . .
RUN npm ci

# build: compile every workspace
FROM deps AS build
RUN npm run build

# api-dev: tsx watch on Bootstrap.ts; compose mounts live source
FROM deps AS api-dev
WORKDIR /app/_apps/media
ENV NODE_ENV=development
EXPOSE 5001
CMD ["npx", "tsx", "watch", "src/Bootstrap.ts"]

# api-production: compiled JS, no live-reload
FROM build AS api-production
ENV NODE_ENV=production
WORKDIR /app/_apps/media
EXPOSE 5001
CMD ["node", "dist/Bootstrap.js"]

# worker-dev: tsx watch on worker.ts
# ffmpeg installed here (and in worker-production)
FROM deps AS worker-dev
RUN apk add --no-cache ffmpeg
WORKDIR /app/_apps/media
ENV NODE_ENV=development
CMD ["npx", "tsx", "watch", "src/worker.ts"]

# worker-production: compiled JS, no live-reload
FROM build AS worker-production
RUN apk add --no-cache ffmpeg
ENV NODE_ENV=production
WORKDIR /app/_apps/media
CMD ["node", "dist/worker.js"]
