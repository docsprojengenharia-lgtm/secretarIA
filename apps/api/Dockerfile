# Stage 1: Instalar dependencias
FROM node:20-slim AS deps
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM deps AS build
COPY packages/db/ ./packages/db/
COPY apps/api/ ./apps/api/
WORKDIR /app/apps/api
RUN npx tsc -p tsconfig.json --outDir dist || true

# Stage 3: Producao
FROM node:20-slim AS runtime
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/packages/db/ ./packages/db/
COPY --from=build /app/apps/api/ ./apps/api/
EXPOSE 3001
# Usar usuario nao-root por seguranca
RUN groupadd -r appuser && useradd -r -g appuser appuser
USER appuser
CMD ["npx", "tsx", "apps/api/src/index.ts"]
