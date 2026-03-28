# Infrastructure Security & Operations

Comprehensive hardening applied across CI/CD, Docker, reverse proxy, and runtime configuration.

## Supply Chain Security

| Measure | Details |
|---------|---------|
| SHA-pinned Actions | All 10 GitHub Actions pinned to full commit SHAs, not mutable version tags |
| Dependabot | Weekly automated PRs for Actions SHA updates (`.github/dependabot.yml`) |
| Image traceability | Every image tagged with both `:dev`/`:latest` and `:tag-<git-sha>` for exact commit identification |

## Container Security

| Measure | Details |
|---------|---------|
| Non-root users | All containers run as unprivileged users (`app` for backend/frontend, `mongodb` for database) |
| Read-only filesystem | Backend and frontend containers use `read_only: true` with scoped `tmpfs` for `/tmp` |
| Capability dropping | `cap_drop: ALL` on every container; MongoDB gets only `CHOWN`, `DAC_OVERRIDE`, `FOWNER`, `SETUID`, `SETGID` |
| Privilege escalation | `no-new-privileges: true` on all containers |
| Localhost binding | All exposed ports bound to `127.0.0.1` — no direct external access |

## Network & Access Control

| Measure | Details |
|---------|---------|
| Network isolation | Separate `backend` and `frontend` Docker networks — frontend cannot reach MongoDB |
| MongoDB authentication | Root credentials via `--auth` flag, authenticated healthcheck, connection URI with `authSource=admin` |
| Secrets management | `.env` files generated at deploy time from GitHub environment secrets — no secrets in repo or on disk manually |
| Swagger blocked in prod | Disabled via Spring profile (`application-prod.yml`) and blocked at Caddy level (404 for `/swagger-ui`, `/docs`, `/v3/api-docs`) |

## HTTP Security Headers (Caddy)

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `Content-Security-Policy` | Scoped `default-src`, `script-src`, `connect-src`, `frame-src` with explicit allowlist for Privy, Alchemy, Google Fonts |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` |
| `Server` | Removed |
| Request body limit | 1 MB max |

## Resource Management

| Measure | Details |
|---------|---------|
| Memory limits | MongoDB 512 MB, backend 256 MB, frontend 256 MB |
| CPU limits | MongoDB 1.0, backend 1.0, frontend 0.5 |
| PID limits | MongoDB 256, backend 128, frontend 128 |
| Log rotation | `json-file` driver, 10 MB max per file, 3 files retained |
| Stop grace period | MongoDB 10s, backend/frontend 5s |

## CI/CD Pipeline

| Measure | Details |
|---------|---------|
| Job timeouts | Contracts 15m, backend 15m, frontend 10m, builds 30m, deploys 10m |
| Parallel builds | Backend and frontend images built concurrently via matrix strategy |
| Healthcheck verification | Post-deploy polling with 60s timeout across both backend and frontend endpoints |
| Rollback on failure | Broken backend/frontend containers are stopped automatically if healthchecks fail |
| Concurrency control | In-progress PR runs are cancelled when new commits are pushed |
| Least privilege | `contents: read` globally; `packages: write` only on build jobs |

## Build Optimization

| Measure | Details |
|---------|---------|
| Multi-stage builds | Build artifacts compiled in full SDK images, runtime uses minimal base (`ubuntu:26.04` / `node:22-alpine`) |
| Layer caching | Dependency layers separated from source layers — rebuilds only what changed |
| BuildKit cache mounts | Gradle (`/root/.gradle`) and npm (`/root/.npm`) caches persist across builds |
| GHA cache | Docker layer cache stored via `type=gha` for CI builds |
| `.dockerignore` | Test sources, IDE files, logs, and build artifacts excluded from context |

## Healthchecks

| Service | Endpoint | Interval | Timeout | Start period | Retries |
|---------|----------|----------|---------|--------------|---------|
| MongoDB | `mongosh` ping with auth | 10s | 3s | 10s | 3 |
| Backend | `GET /api/v1/health` | 10s | 3s | 5s | 3 |
| Frontend | `GET /api/health` | 10s | 3s | 5s | 3 |
