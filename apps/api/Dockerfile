FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile

FROM deps AS app
COPY . .
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "--import", "tsx/esm", "src/index.ts"]
