# DuelMe

P2P gaming duel platform — players wager USDT in 1v1 duels via smart contracts on Ethereum L2s. Zero fees, honor-based result reporting with on-chain reputation.

## Monorepo Structure

```
contracts/   — Solidity smart contracts (Foundry)
frontend/    — Next.js web app (App Router)
backend/     — Java 25 + Spring Boot 4 API (Gradle)
ops/         — Docker Compose, Caddy config
```

## Commands

### Frontend (`frontend/`)
```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type-check (no emit)
```

### Backend (`backend/`)
```bash
./gradlew build          # Compile + test (uses JDK 25 via toolchain)
./gradlew bootRun        # Dev server (localhost:8080, needs MongoDB)
./gradlew test           # Run tests only (embedded MongoDB via Flapdoodle)
./gradlew bootJar        # Build fat JAR
./gradlew nativeCompile  # GraalVM native image (~50ms startup, ~60MB RSS)
./gradlew nativeTest     # Run tests inside native binary
docker compose up -d     # Local MongoDB
```

### Contracts (`contracts/`)
```bash
forge build          # Compile
forge test           # Run tests
forge test -vvv      # Verbose test output
forge coverage --report summary  # Coverage
```

## Git Conventions

- **Never** add `Co-Authored-By` or any Claude attribution to commits
- Commit messages: imperative mood, explain "why" not "what"
- Do not push unless explicitly asked
- Do not amend existing commits unless explicitly asked

## Architecture Decisions

### Wallet Integration
- `createConfig` must be imported from `@privy-io/wagmi`, NOT from `wagmi`
- `setActiveWalletForWagmi` prop on `<WagmiProvider>` ensures Privy embedded wallet is used over MetaMask
- Chain switching must use `useSwitchChain` from wagmi (not Privy's `switchChain`)

### Transaction Pattern
All write operations follow: check chain → check allowance → approve if needed → execute. `createDuel` generates a private invite secret client-side and sends only its hash on-chain; `joinDuel` and `declineDuel` use the shared invite secret. Payouts are pull-based now, so terminal duel flows should expose claimable balances instead of assuming immediate push transfers.

### Data Fetching
- wagmi `useReadContract` / `useReadContracts` (multicall) for on-chain reads
- React Query with `refetchInterval: 10_000, staleTime: 0` for live data
- Always `refetch()` + `reset()` after successful write transactions
- Header and wallet balances also use `frontend/src/lib/balanceRefresh.ts` for event-driven refresh after balance-changing actions, while 30-second polling stays as a fallback

### Backend
- Java 25 + Spring Boot 4.0.3, Gradle 9.4 (Kotlin DSL)
- MongoDB for profile storage, Spring Data MongoDB with auditing
- Privy JWT authentication via JWKS — wallet address extracted from `linked_accounts` claim
- Flapdoodle embedded MongoDB for tests — no external DB needed in CI
- GraalVM Native Image support via `org.graalvm.buildtools.native` plugin
- JDK 25 optimizations: Compact Object Headers (Lilliput), Generational ZGC, Virtual Threads
- `NativeImageHints.java` registers reflection hints for nimbus-jose-jwt (JWKS/JWT verification)

### Deployment
- Two environments: **dev** (dev.duelme.pro) and **prod** (duelme.pro)
- CI: `.github/workflows/ci.yml` — merging to `dev` deploys dev, merging to `main` deploys prod
- All services run in Docker containers (non-root, read-only FS, healthchecks)
- Dev: `ops/docker-compose.dev.yml` → `~/apps/duelme-dev/`, `:dev` tags, ports 8080/3001
- Prod: `ops/docker-compose.prod.yml` → `~/apps/duelme-prod/`, `:latest` tags, ports 8081/3002
- Images pushed to GHCR (`ghcr.io/plusqred/duelme-{backend,frontend}:{dev,latest}`)
- CI builds images via `docker/build-push-action`, then SSH `docker compose pull && up -d`
- Caddy on host handles TLS + reverse proxy (`/api/v1/*` → backend, rest → frontend)
- Caddy configs: `ops/caddy/dev.duelme.pro.Caddyfile` and `ops/caddy/duelme.pro.Caddyfile`

### Smart Contract
- Solidity 0.8.34, OpenZeppelin (SafeERC20, ReentrancyGuard, Pausable, Ownable)
- All state-mutating functions have `nonReentrant` + `whenNotPaused`
- USDT uses 6 decimals — `wagerAmount` is stored raw (e.g., `5_000_000` = 5 USDT)
- Duel payouts/refunds are claim-based via `claimPayout(uint256)` and `claimPayouts(uint256[])`
- Mutual cancellation exists via `MutualCancelRequested` and `MutuallyCancelled`
- Duel messages are stored on-chain as UTF-8 `string` values with max 32 code points / 128 bytes
- Emergency withdraw has 30-day timelock for USDT; non-USDT tokens can be rescued instantly

## Key Files

| File | Purpose |
|------|---------|
| `contracts/src/DuelMe.sol` | Core duel contract |
| `frontend/src/lib/wagmi.ts` | wagmi config (Privy adapter) |
| `frontend/src/lib/contracts.ts` | ABI, DuelState enum |
| `frontend/src/lib/constants.ts` | Chain configs, contract addresses |
| `frontend/src/components/providers/Providers.tsx` | Privy + wagmi + QueryClient providers |
| `frontend/src/hooks/useDuel.ts` | Read single duel |
| `frontend/src/hooks/useDuelActions.ts` | Write actions (join, cancel, claim, etc.) |
| `frontend/src/hooks/usePlayerDuels.ts` | Multicall all duels, filter by player |
| `frontend/src/hooks/usePlatformStats.ts` | Landing-page Total Volume / Duels Played stats |
| `frontend/src/hooks/useRecentDuels.ts` | Landing-page duel feed with newest-first ordering |
| `frontend/src/hooks/useReputation.ts` | Wilson Score reputation calculation |
| `frontend/src/hooks/useReputationLevels.ts` | Batch reputation reads for feed and search surfaces |
| `frontend/src/lib/invite.ts` | Secure invite-secret generation/storage helpers |
| `frontend/src/lib/duelMessage.ts` | Frontend Unicode duel-message validation |
| `frontend/src/lib/duelSearch.ts` | Shared visible-field search indexing for dashboard/recent duels |
| `frontend/src/lib/balanceRefresh.ts` | Shared client-side balance refresh event bus |
| `frontend/src/i18n/translations.ts` | EN/RU translations |
| `scripts/sync_readme_contract_addresses.py` | Sync README contract block from `run-latest.json` |
| `backend/src/.../controller/ProfileController.java` | Profile CRUD endpoints |
| `backend/src/.../security/PrivyJwksService.java` | Privy JWT verification via JWKS |
| `backend/src/.../security/PrivyJwtAuthenticationFilter.java` | Bearer token → wallet auth filter |
| `backend/src/.../model/Profile.java` | MongoDB profile document (record) |
| `frontend/src/lib/profile.ts` | Profile types and validation constants |
| `frontend/src/lib/profileApi.ts` | Backend profile API client |
| `frontend/src/hooks/useMyProfile.ts` | Current user's profile (read/write) |
| `frontend/src/hooks/useProfile.ts` | Read any player's profile by wallet |
| `frontend/src/hooks/useNicknames.ts` | Batch nickname resolution for duel feeds |
| `frontend/src/components/duel/CopyableAddress.tsx` | Address display with copy + profile link |
| `frontend/src/app/profile/page.tsx` | Own profile page |
| `frontend/src/app/profile/[walletAddress]/page.tsx` | Public profile page |
| `backend/Dockerfile` | Backend container image (multi-stage, GraalVM native) |
| `frontend/Dockerfile` | Frontend container image (multi-stage, Node 22) |
| `.github/workflows/ci.yml` | CI pipeline: test + deploy (dev & prod) |
| `ops/docker-compose.dev.yml` | Dev compose stack (`:dev` tags, ports 8080/3001) |
| `ops/docker-compose.prod.yml` | Prod compose stack (`:latest` tags, ports 8081/3002) |
| `ops/caddy/dev.duelme.pro.Caddyfile` | Caddy reverse proxy for dev.duelme.pro |
| `ops/caddy/duelme.pro.Caddyfile` | Caddy reverse proxy for duelme.pro |

## Duel States

```
Created(0) → Funded(1) → WinnerClaimed(2) → Resolved(3)
                                           → Refunded(4)
                                           → Disputed(7)
Funded(1) → MutualCancelRequested(8) → Funded(1)
                                     → MutuallyCancelled(9)
Created(0) → Cancelled(5)
           → Declined(6)
```

## Code Style

- TypeScript strict mode, functional components with hooks
- Tailwind CSS + shadcn/ui for styling
- Translations via `useTranslation()` — always add both EN and RU keys
- `truncateAddress()` for display, full address with copy button for important contexts

### Backend API Documentation (MANDATORY)

Every backend REST endpoint **must** have complete OpenAPI/Swagger documentation. This is a blocking requirement — do not merge endpoints without it.

When **adding** a new endpoint:
1. Annotate the controller class with `@Tag(name = "...", description = "...")` if not already present
2. Annotate the method with `@Operation(summary = "...")` — concise one-line description
3. Add `security = @SecurityRequirement(name = "bearer")` to `@Operation` if the endpoint requires authentication
4. Annotate `@AuthenticationPrincipal` parameters with `@Parameter(hidden = true)` so they don't appear in Swagger UI
5. Add the endpoint path to `SecurityConfig.java` with `.permitAll()` or `.authenticated()` as appropriate
6. If the endpoint is public, also add it to the Swagger UI permit list in SecurityConfig

When **modifying** an existing endpoint:
1. Update `@Operation(summary = ...)` if the behavior changed
2. Update security annotations if auth requirements changed
3. Update `SecurityConfig.java` if the path or HTTP method changed

OpenAPI config: `backend/src/main/java/pro/duelme/backend/config/OpenApiConfig.java`
Swagger UI: `https://dev.duelme.pro/api/v1/swagger-ui` (dev) / `https://duelme.pro/api/v1/swagger-ui` (prod) — API docs JSON: `/v3/api-docs`

## Environment

- `NEXT_PUBLIC_PRIVY_APP_ID` — Privy app ID (required for frontend)
- `PRIVY_APP_ID` — Privy app ID (required for backend JWT verification)
- `MONGODB_URI` — MongoDB connection string (default: `mongodb://localhost:27017/duelme`); Spring Boot 4 property: `spring.mongodb.uri` (not `spring.data.mongodb.uri`)
- `NEXT_PUBLIC_API_URL` — Backend API base URL (default: `/api/v1`)
- Currently deployed on Arbitrum Sepolia (testnet, chainId 421614)
- Contract address in `DUELME_ADDRESSES` map in `constants.ts`

## Common Pitfalls

- Importing `createConfig` from `wagmi` instead of `@privy-io/wagmi` breaks wallet routing silently
- `useSetActiveWallet` in useEffect is too late — use `setActiveWalletForWagmi` sync callback
- Invite-only duels rely on the full private link (URL fragment) — do not fall back to sharing plain `/duel/{id}` URLs
- USDT has a blocklist — keep payouts pull-based and do not reintroduce push transfers
- Wilson Score gives low scores for small sample sizes — players with 0 abandoned duels are never "unreliable"
- Only `contracts/broadcast/Deploy.s.sol/421614/run-latest.json` should be tracked; timestamped `run-*.json` files stay ignored
- README contract addresses are generated from `run-latest.json`; let `scripts/sync_readme_contract_addresses.py` / the pre-commit hook update that block
- In this environment, source `contracts/.env` before manual deploys (`set -a && . ./.env && set +a`)

## Done — Durable Session Memory

- Done: secure invite bearer-link flow with `inviteHash` on-chain and the raw secret in the URL fragment for join/decline
- Done: pull-based payouts with claim-all / per-duel claims, payout timestamps, and localized top-center toasts
- Done: mutual cancellation that pauses funded duels, lets the responder accept/decline, and lets the requester withdraw
- Done: spectator-safe duel details, clearer won/lost/no-winner dashboard cards, and claimed / claim-ready markers
- Done: Unicode duel messages (up to 32 visible code points) shown in create, duel detail, dashboard, and latest-duels surfaces
- Done: dashboard and latest-duels search now operate on visible UI concepts, not just raw addresses
- Done: hero metrics now show live on-chain Total Volume and Duels Played values
- Done: personal profiles with inline editing, nickname resolution in duel components, profile links everywhere
- Source of truth for current deploys: `contracts/broadcast/Deploy.s.sol/421614/run-latest.json`, mirrored into `README.md` and `frontend/src/lib/constants.ts`
