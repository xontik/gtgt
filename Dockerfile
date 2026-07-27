# Single-container build: the Fastify API serves both /api/* and the
# built Vue SPA (no nginx, no second container). Build context is the
# repo root (pnpm workspace):
#   docker build -t gtg-tracker .
FROM node:24-slim AS build

RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile --filter "@gtg/api..." --filter "@gtg/web..."
RUN pnpm --filter @gtg/web run build

FROM node:24-slim
RUN corepack enable
WORKDIR /app

# Fresh, api-only install for the runtime image - keeps the web build
# toolchain (vite, vue-tsc, ...) out of it.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --filter "@gtg/api..."

COPY --from=build /app/apps/web/dist ./apps/api/public

WORKDIR /app/apps/api
ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/gtg.sqlite

EXPOSE 3001
VOLUME /data

CMD ["sh", "-c", "pnpm db:migrate && pnpm exec tsx src/index.ts"]
