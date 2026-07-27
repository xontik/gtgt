# Build context is the repo root (pnpm workspace), e.g.:
#   docker build -f apps/web/Dockerfile -t gtg-web .
FROM node:24-slim AS build

RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile --filter "@gtg/web..."

WORKDIR /app/apps/web
RUN pnpm run build

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
