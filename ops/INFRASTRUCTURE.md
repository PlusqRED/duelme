# Infrastructure Security & Operations

Comprehensive hardening applied across CI/CD, Docker, reverse proxy, and runtime configuration.

## Supply Chain Security

| Measure | Details |
|---------|---------|
| SHA-pinned Actions | Every GitHub Action pinned to a full commit SHA, not a mutable version tag (14 distinct actions) |
| Dependabot | Weekly automated PRs for Actions SHA updates (`.github/dependabot.yml`) |
| Image traceability | Every image tagged with both `:dev`/`:latest` and `:tag-<git-sha>` for exact commit identification |

## Container Security

| Measure | Details |
|---------|---------|
| Non-root users | All containers run as unprivileged users (`app` for backend/frontend, `mongodb` for database) |
| Read-only filesystem | Backend, frontend and every analytics container use `read_only: true` with scoped `tmpfs` for `/tmp` (and what else each writes at runtime) |
| Capability dropping | `cap_drop: ALL` on every container; MongoDB and Postgres get only `CHOWN`, `DAC_OVERRIDE`, `FOWNER`, `SETUID`, `SETGID` (ClickHouse also `KILL`, Redis only `CHOWN`, `SETUID`, `SETGID`) to drop to their own user; the Rybbit backend and dashboard get none |
| Privilege escalation | `no-new-privileges: true` on all containers |
| Localhost binding | All exposed ports bound to `127.0.0.1` — no direct external access |

## Network & Access Control

| Measure | Details |
|---------|---------|
| Network isolation | Separate `backend` and `frontend` Docker networks — frontend cannot reach MongoDB |
| MongoDB authentication | Root credentials via `--auth` flag, unauthenticated `ping` healthcheck (no credentials in any argv), connection URI with `authSource=admin` |
| Secrets management | `.env` files generated at deploy time from GitHub environment secrets — no secrets in repo or on disk manually |
| Analytics ingest allowlist | The public sites pass only the tracker's own paths under `/t/` to Rybbit; any other `/t/` path is a 404, so its dashboard API is reachable only through stats.duelme.pro. Caddy sets `X-Real-IP` to the connecting address and drops `CF-Connecting-IP`, the two headers Rybbit trusts before `X-Forwarded-For`, so an event cannot pass for another IP (Rybbit's identify still takes one from its body) |
| Analytics dashboard | stats.duelme.pro: Caddy basic auth (bcrypt, kept on the host only) before Rybbit's login, sign-up closed, `X-Robots-Tag: noindex`; fail2ban bans an IP for a day after 5 wrong passwords in an hour |
| Analytics stores | ClickHouse, Postgres and Redis on an internal Docker network with no host ports; Redis's password via a tmpfs config file, not argv |
| Swagger blocked in prod | Switched off in `application-prod.yml` and denied at runtime by `SecurityConfig` (the native image ignores the profile's springdoc switches) and blocked at Caddy level (404 for `/api/v1/swagger-ui*`, `/api/v1/docs*`, `/api/v1/v3/api-docs*`) |

## HTTP Security Headers (Caddy)

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Content-Security-Policy` | Scoped `default-src`, `script-src`, `connect-src`, `frame-src` with explicit allowlist for Privy, the RPC hosts and Google Fonts |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` |
| `Server`, `X-Powered-By` | Removed |
| Request body limit | 1 MB max; 10 MB for analytics session-replay uploads (`/t/session-replay/record/*`) |

## Resource Management

| Measure | Details |
|---------|---------|
| Memory limits | MongoDB 512 MB, backend 256 MB, frontend 256 MB; analytics: ClickHouse 4 GB, Rybbit backend 1 GB, Postgres and dashboard 512 MB, Redis 256 MB |
| CPU limits | MongoDB 1.0, backend 1.0, frontend 0.5; analytics: ClickHouse 2.0, Rybbit backend 2.0, Postgres and dashboard 1.0, Redis 0.5 |
| PID limits | MongoDB 256, backend 128, frontend 128; analytics: ClickHouse 4096 (it counts threads), Rybbit backend 512, Postgres 256, dashboard 128, Redis 64 |
| Log rotation | `json-file` driver, 10 MB max per file, 3 files retained; ClickHouse logs to the console only, so Docker rotates its logs too |
| Analytics disk guard | ClickHouse stops writing while the host disk has under 50 GiB free, so a flood of public uploads cannot fill the disk MongoDB shares; Rybbit's Postgres has no such guard, and nothing rate-limits the public tracker paths |
| Stop grace period | MongoDB 10s, backend/frontend 5s |

## CI/CD Pipeline

| Measure | Details |
|---------|---------|
| Job timeouts | Contracts 15m, USDT fork 15m, backend 15m, frontend 10m, builds 30m, deploys 10m |
| Prod gated on native build | `build-prod` needs `backend-native`; a broken native image cannot reach production |
| Parallel builds | Backend and frontend images built concurrently via matrix strategy |
| Healthcheck verification | Post-deploy polling for up to 90s across both backend and frontend endpoints; both must report their environment and the commit just built as `release` |
| Image cleanup | After a healthy deploy, the untagged images the stack ran before it are removed; no host-wide prune |
| Rollback on failure | If the deploy fails, each of backend and frontend that does not answer its healthcheck is stopped; one that still answers, on whatever release, is left running |
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
| MongoDB | `mongosh` ping (needs no auth) | 10s | 3s | 10s | 3 |
| Backend | `GET /api/v1/health` | 10s | 3s | 5s | 3 |
| Frontend | `GET /api/health` | 10s | 3s | 5s | 3 |
