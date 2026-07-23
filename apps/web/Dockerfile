FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_URL
ARG VITE_APP_ORIGIN
ARG VITE_APP_VERSION=prod
ARG VITE_BUILD_ID=prod
ARG VITE_TEACHER_FEEDBACK_ENABLED=false
ARG VITE_FEEDBACK_FORM_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_ORIGIN=$VITE_APP_ORIGIN
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_BUILD_ID=$VITE_BUILD_ID
ENV VITE_TEACHER_FEEDBACK_ENABLED=$VITE_TEACHER_FEEDBACK_ENABLED
ENV VITE_FEEDBACK_FORM_URL=$VITE_FEEDBACK_FORM_URL

RUN pnpm --filter @teacher-exam/web build

FROM caddy:alpine AS runtime
COPY apps/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist /srv
EXPOSE 80
