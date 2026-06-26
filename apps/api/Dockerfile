FROM node:22-bookworm AS base
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
RUN mkdir -p /app/uploads && chown node:node /app/uploads
# Playwright's bundled Chromium is glibc-only; needs the bookworm (Debian) base.
# --with-deps runs apt-get for libnss3/libatk1.0/libgbm/etc. Binary lands in /ms-playwright.
RUN pnpm --filter @teacher-exam/api exec playwright install --with-deps chromium
USER node
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "--import", "tsx/esm", "src/index.ts"]
