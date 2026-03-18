FROM node:20-slim AS base

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --prod=false

COPY packages/db/ ./packages/db/
COPY apps/api/ ./apps/api/

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["npx", "tsx", "src/index.ts"]
