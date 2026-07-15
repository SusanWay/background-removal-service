FROM node:24-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable \
    && corepack install --global pnpm@10.28.2


FROM base AS dependencies

WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile


FROM base AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules

COPY frontend/ ./
COPY proto/ ./proto/

RUN pnpm build


FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV GRPC_PROTO_PATH=/app/proto/background_removal.proto

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/proto ./proto

EXPOSE 3000

HEALTHCHECK \
    --interval=30s \
    --timeout=5s \
    --start-period=15s \
    --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", ".output/server/index.mjs"]