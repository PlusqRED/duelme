# Ops, CI and deploy (`ops/`, `.github/`)

Environments, CI jobs and deploys. The root `CLAUDE.md` applies here too.

## Deployment

- Two envs: **dev** (dev.duelme.pro) and **prod** (duelme.pro). CI: `.github/workflows/ci.yml` — merge to `dev` deploys dev, merge to `main` deploys prod.
- All services in Docker (non-root, read-only FS, healthchecks).
- Dev: `ops/docker-compose.dev.yml` → `~/apps/duelme-dev/`, `:dev` tags, ports 8080/3001
- Prod: `ops/docker-compose.prod.yml` → `~/apps/duelme-prod/`, `:latest` tags, ports 8081/3002
- **Backend build split: Gradle on host, Docker is a thin runtime.** CI runs Gradle once with full GHA cache, uploads artifact, then `docker/build-push-action` just `COPY`s it. Two `backend/Dockerfile` targets:
  - `target=jvm` (`eclipse-temurin:25-jre`, fat JAR) — **dev**, `mem_limit: 512m`. Built by `backend` job (`./gradlew build`).
  - `target=native` (`ubuntu:26.04`, GraalVM binary) — **prod**, `mem_limit: 256m`. Built by `backend-native` job. Also smoke-built on every push/PR.
- **Local docker build** (Gradle no longer inside Dockerfile):
  - JVM: `cd backend && ./gradlew bootJar -Pskip.aot=true && docker build --target jvm -t duelme-backend:local .`
  - Native: `cd backend && ./gradlew nativeCompile && docker build --target native -t duelme-backend:local .`
  - For day-to-day backend dev, prefer `./gradlew bootRun` — much faster.
- Images: `ghcr.io/plusqred/duelme-{backend,frontend}:{dev,latest}`
- Runtime secrets in GitHub repository/environment secrets; deploy job renders remote `.env` from them before `docker compose up`. Never commit secrets.
- Both images carry the commit they were built from (`APP_RELEASE`, baked in at build time) and both health endpoints report it with `environment` (`unknown` when unset). A deploy passes only when both services answer with its environment and the commit it built; then it removes the images its own stack ran before and that lost their tag, never anything else on the shared Docker host — no `docker image prune`.
- Caddy on host: TLS + reverse proxy (`/api/v1/*` → backend, rest → frontend). Configs: `ops/caddy/{dev.duelme.pro,duelme.pro}.Caddyfile`.

## Key Files

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | CI pipeline: test + deploy (dev & prod) |
| `.github/workflows/usdt-fork.yml` | Fork suite against the real USD₮0 on Arbitrum One (see Commands in `contracts/CLAUDE.md`) |
| `.github/pull_request_template.md` | PR description skeleton; its Checks table is required (see Git Conventions in the root `CLAUDE.md`) |
| `ops/docker-compose.{dev,prod}.yml` | Compose stacks |
| `ops/caddy/{dev.duelme.pro,duelme.pro}.Caddyfile` | Caddy reverse proxy |

## Environment

The other variables are listed with the code that reads them, deploy constraints included (the
relayer key is runtime-only; prod pins the faucet off): `frontend/CLAUDE.md`, `backend/CLAUDE.md`.

- `APP_ENV` / `APP_RELEASE` — reported by both health endpoints (see Deployment). Not secrets and not in `.env`: `APP_ENV` is a literal in each compose file, `APP_RELEASE` a build arg.

## Common Pitfalls

- The CSP lives in the Caddyfiles here, but the rule for adding a host — and the hand-maintained live
  `/etc/caddy/Caddyfile` — is the CSP pitfall in `frontend/CLAUDE.md`, where new hosts come from.
