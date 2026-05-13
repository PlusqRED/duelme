# Dockerfile is invoked with build context = `ton/` so the miniapp can import
# the hand-mirrored TypeScript wrapper at `ton/contracts/wrappers/DuelMe.ts`
# via the `@duelme/contracts/*` path alias in tsconfig (which resolves to
# `../contracts/*`). The container layout mirrors the host: `/app/miniapp/`
# beside `/app/contracts/`, so the same tsconfig works in both contexts.
#
# Build:
#   cd ton/
#   docker build -f miniapp/Dockerfile \
#     --build-arg NEXT_PUBLIC_DUELME_ADDRESS=... \
#     -t duelme-tg:dev .

FROM node:22-alpine AS build
WORKDIR /app/miniapp

RUN corepack enable npm && corepack prepare npm@11.12.1 --activate

# Layer 1: Dependencies (only invalidates when miniapp lock-file changes)
COPY miniapp/package.json miniapp/package-lock.json miniapp/.npmrc ./
RUN npm ci --prefer-offline --no-audit --no-fund

# Layer 2: Config files
COPY miniapp/next.config.ts miniapp/tsconfig.json miniapp/tailwind.config.ts \
     miniapp/postcss.config.js miniapp/eslint.config.mjs miniapp/next-env.d.ts ./

# Layer 3: App source
COPY miniapp/src ./src
COPY miniapp/public ./public

# Layer 4: Build with NEXT_PUBLIC_* baked in (Next.js inlines them into the
# client bundle, so they must be passed as build args, not runtime env).
ARG NEXT_PUBLIC_TON_NETWORK=testnet
ARG NEXT_PUBLIC_DUELME_ADDRESS
ARG NEXT_PUBLIC_TONCENTER_URL
ARG NEXT_PUBLIC_TONCENTER_API_KEY
ARG NEXT_PUBLIC_TONCONNECT_MANIFEST_URL
ARG NEXT_PUBLIC_TG_BOT_USERNAME
ARG NEXT_PUBLIC_TG_APP_SHORT_NAME
ENV NEXT_PUBLIC_TON_NETWORK=$NEXT_PUBLIC_TON_NETWORK \
    NEXT_PUBLIC_DUELME_ADDRESS=$NEXT_PUBLIC_DUELME_ADDRESS \
    NEXT_PUBLIC_TONCENTER_URL=$NEXT_PUBLIC_TONCENTER_URL \
    NEXT_PUBLIC_TONCENTER_API_KEY=$NEXT_PUBLIC_TONCENTER_API_KEY \
    NEXT_PUBLIC_TONCONNECT_MANIFEST_URL=$NEXT_PUBLIC_TONCONNECT_MANIFEST_URL \
    NEXT_PUBLIC_TG_BOT_USERNAME=$NEXT_PUBLIC_TG_BOT_USERNAME \
    NEXT_PUBLIC_TG_APP_SHORT_NAME=$NEXT_PUBLIC_TG_APP_SHORT_NAME
RUN npm run build

# ---

FROM node:22-alpine

RUN apk add --no-cache curl \
    && addgroup -S app \
    && adduser -S -G app app

WORKDIR /app
COPY --from=build --chown=app:app /app/miniapp/.next/standalone ./
COPY --from=build --chown=app:app /app/miniapp/.next/static ./.next/static
COPY --from=build --chown=app:app /app/miniapp/public ./public

USER app
EXPOSE 3015
ENV PORT=3015 HOSTNAME=0.0.0.0

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -sf http://localhost:3015/ || exit 1

CMD ["node", "server.js"]
