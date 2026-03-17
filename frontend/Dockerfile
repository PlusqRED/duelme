FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit --no-fund

COPY . .
ARG NEXT_PUBLIC_PRIVY_APP_ID
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
