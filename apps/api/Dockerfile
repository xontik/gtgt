# Build context is the repo root (pnpm workspace), e.g.:
#   docker build -f apps/api/Dockerfile -t gtg-api .
FROM node:24-slim

RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile --filter "@gtg/api..."

WORKDIR /app/apps/api
ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/gtg.sqlite

EXPOSE 3001
VOLUME /data

CMD ["sh", "-c", "pnpm db:migrate && pnpm exec tsx src/index.ts"]
