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
- Caddy on host: TLS + reverse proxy (`/api/v1/*` → backend, `/t/*` → analytics, rest → frontend). Configs: `ops/caddy/{dev.duelme.pro,duelme.pro}.Caddyfile`, and `stats.duelme.pro.Caddyfile` for the analytics dashboard.

## Analytics

- Self-hosted [Rybbit](https://github.com/rybbit-io/rybbit) v2.9.0 in `ops/rybbit/` →
  `~/apps/rybbit/`, one stack for both environments, a site each. ClickHouse, Postgres and Redis sit
  on an internal network with no host ports; the backend (API and ingest) is `127.0.0.1:3030`, the
  dashboard `127.0.0.1:3031`.
- Deployed by `.github/workflows/rybbit.yml`, not by CI's deploys: a push to `dev` that touches
  `ops/rybbit/**` deploys it, a pull request only validates it. So a change to the stack reaches
  both environments' analytics at its merge to `dev`; a release to `main` carries nothing of it.
  Its secrets are the `RYBBIT_*` ones in the `dev` environment, which also holds the host's deploy key.
- The site id is the `RYBBIT_SITE_ID` variable of each environment (`vars`, not a secret: it ends up
  in the page), built into the frontend image; unset, the site loads no tracker. What the tracker
  collects (clicks, errors, web vitals, replays…) is each site's settings in the dashboard, not
  code, and the privacy page lists it (`privacy.analytics.*` in
  `frontend/src/i18n/translations/privacy.ts`): a setting turned on goes onto that list too. Keep
  "track IP" off: the page says the IP is not kept.
- Players' browsers reach the tracker on the site itself: Caddy rewrites an allowlist of
  `/t/*` paths (the scripts, `track`, `identify`, the tracking config, replay uploads) to `/api/*`
  on 3030 and answers 404 for any other `/t/` path, so the dashboard's API is never served from
  duelme.pro, and the CSP needs no analytics host. Replay uploads may be 10 MB; every other body 1 MB.
- The dashboard, stats.duelme.pro, is behind Caddy basic auth before Rybbit's own login. The login
  and bcrypt hash live only on the host, in `/etc/caddy/stats-auth.caddy` (root:caddy, 0640), which
  the site imports. fail2ban (`ops/fail2ban/`, jail `duelme-stats`) reads the site's log and bans an
  IP for a day after 5 wrong passwords in an hour.
- Sign-up is closed (`DISABLE_SIGNUP`). For the first account, run the workflow by hand on `dev`
  with `allow_signup`, sign up, then run it again without it.
- Rybbit deletes replays after 30 days; events are kept until deleted.

## Key Files

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | CI pipeline: test + deploy (dev & prod) |
| `.github/workflows/usdt-fork.yml` | Fork suite against the real USD₮0 on Arbitrum One (see Commands in `contracts/CLAUDE.md`) |
| `.github/pull_request_template.md` | PR description skeleton; its Checks table is required (see Git Conventions in the root `CLAUDE.md`) |
| `ops/docker-compose.{dev,prod}.yml` | Compose stacks |
| `ops/caddy/{dev.duelme.pro,duelme.pro}.Caddyfile` | Caddy reverse proxy |
| `.github/workflows/rybbit.yml` | Validates and deploys the analytics stack (see Analytics) |
| `ops/rybbit/docker-compose.yml` | The analytics stack, hardened like ours; `ops/rybbit/clickhouse/` its ClickHouse settings |
| `ops/caddy/stats.duelme.pro.Caddyfile` | The analytics dashboard behind basic auth |
| `ops/fail2ban/` | Filter and jail that ban an IP guessing the dashboard's password |

## Environment

The other variables are listed with the code that reads them, deploy constraints included (the
relayer key is runtime-only; prod pins the faucet off): `frontend/CLAUDE.md`, `backend/CLAUDE.md`.

- `APP_ENV` / `APP_RELEASE` — reported by both health endpoints (see Deployment). Not secrets and not in `.env`: `APP_ENV` is a literal in each compose file, `APP_RELEASE` a build arg.
- `RYBBIT_*` secrets, `RYBBIT_SITE_ID` and `DISABLE_SIGNUP` — the analytics stack's: see Analytics.

## Common Pitfalls

- The CSP lives in the Caddyfiles here, but the rule for adding a host — and the hand-maintained live
  `/etc/caddy/Caddyfile` — is the CSP pitfall in `frontend/CLAUDE.md`, where new hosts come from.
- The relayer's per-IP rate limit reads the right-most `X-Forwarded-For` entry, which is the
  client only while nothing sits in front of Caddy. Putting a CDN or proxy there, or setting
  `trusted_proxies`, means changing that rule too: see the `X-Forwarded-For` pitfall in `frontend/CLAUDE.md`.
- **The live Caddyfile carries the analytics routes and the stats site by hand.** A Rybbit upgrade
  that adds a tracker path needs it in the `@rybbit` allowlist of both site files here and of the
  live `/etc/caddy/Caddyfile`; until then the tracker's request is a 404, which nothing reports.
- **Postgres reads `POSTGRES_PASSWORD` only when it creates its volume.** Changing
  `RYBBIT_POSTGRES_PASSWORD` alone leaves the database on the old one and the Rybbit backend unable
  to log in. Change it in the database first (`ALTER USER rybbit PASSWORD …` through
  `docker compose exec postgres psql`), then the secret, then deploy.
- **The fail2ban ban covers ports 80 and 443 for the whole host**, duelme.pro included: someone who
  mistypes the dashboard password five times loses the site for a day. `fail2ban-client set
  duelme-stats unbanip <ip>` lifts it.
