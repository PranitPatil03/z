FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json biome.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/ai/package.json packages/ai/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/sdk/package.json packages/sdk/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN pnpm --filter @foreman/api build

FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
COPY --from=builder /app /app
EXPOSE 3001
CMD ["pnpm", "--filter", "@foreman/api", "exec", "tsx", "src/index.ts"]