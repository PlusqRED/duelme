FROM node:22-alpine AS build
WORKDIR /app

# Pin npm via Corepack to match frontend/package.json packageManager and CI.
# `corepack enable` on its own does NOT shim npm (npm ships with Node); we have
# to enable npm explicitly so the shim honours the `packageManager` field.
RUN corepack enable npm && corepack prepare npm@11.12.1 --activate

# Layer 1: Dependencies (changes only when package-lock.json changes)
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund

# Layer 2: Config files (rarely change independently from source)
COPY next.config.ts tsconfig.json postcss.config.mjs components.json ./

# Layer 3: Source code (changes frequently → layers above stay cached)
COPY src src
COPY public public

# Layer 4: Build
ARG NEXT_PUBLIC_PRIVY_APP_ID
ARG NEXT_PUBLIC_DEFAULT_CHAIN_KEY
ARG NEXT_PUBLIC_ARBITRUM_RPC_URL
ARG NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL
ARG NEXT_PUBLIC_PIMLICO_API_KEY
ARG NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM
ARG NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM_SEPOLIA
ENV NEXT_PUBLIC_PRIVY_APP_ID=$NEXT_PUBLIC_PRIVY_APP_ID
ENV NEXT_PUBLIC_DEFAULT_CHAIN_KEY=$NEXT_PUBLIC_DEFAULT_CHAIN_KEY
ENV NEXT_PUBLIC_ARBITRUM_RPC_URL=$NEXT_PUBLIC_ARBITRUM_RPC_URL
ENV NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL=$NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL
ENV NEXT_PUBLIC_PIMLICO_API_KEY=$NEXT_PUBLIC_PIMLICO_API_KEY
ENV NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM=$NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM
ENV NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM_SEPOLIA=$NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM_SEPOLIA
RUN npm run build

# ---

FROM node:22-alpine

RUN apk add --no-cache curl \
    && addgroup -S app \
    && adduser -S -G app app

WORKDIR /app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public

USER app
EXPOSE 3001
ENV PORT=3001 HOSTNAME=0.0.0.0

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -sf http://localhost:3001/api/health || exit 1

CMD ["node", "server.js"]
