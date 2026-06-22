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

**Frontend (`frontend/`):** `npm run dev` (localhost:3000) · `npm run build` · `npm run lint` · `npx tsc --noEmit`

**Backend (`backend/`):** `./gradlew build` (JDK 25 via toolchain) · `./gradlew bootRun` (localhost:8080, needs MongoDB) · `./gradlew test` (embedded MongoDB via Flapdoodle) · `./gradlew bootJar` · `./gradlew nativeCompile` (~5–10 min, ~50ms startup, ~60MB RSS) · `./gradlew nativeTest` · `docker compose up -d` (local MongoDB)

**Contracts (`contracts/`):** `forge build` · `forge test` · `forge test -vvv` · `forge coverage --report summary`

## Git Conventions

- **Never** run `git add` / `commit` / `push` (or any equivalent like `git commit -a`, `git push --force`, `gh pr create`) unless the user explicitly asks for THAT specific action in their current message. Permission is per-action and per-message; past authorization does not carry forward. Read-only git commands (`status`, `diff`, `log`, `show`) are fine. After changes, stop at the working tree and report the diff — wait before staging/committing/pushing.
- **Never** add `Co-Authored-By` or any Claude attribution to commits.
- Don't amend existing commits unless explicitly asked.
- Commit messages: imperative mood ("Add X" not "Added X"); first line ≤72 chars; body for non-obvious context.

## Native Image Compatibility (CRITICAL)

**Production backend ships as a GraalVM native image.** Dev runs JVM, so a change can pass `./gradlew test`, deploy fine to dev, and still **silently break prod**. "Tests pass" ≠ "ready to merge".

The `backend-native` CI job (`./gradlew nativeCompile` on every push/PR to `dev`/`main`) is **the gate**. `build-prod` lists it in `needs:`, so a red `backend-native` blocks prod deploy. Do not add `if:` conditions — GitHub Actions treats skipped needs as success. If `backend-native` is red, do not merge to `main`.

### What commonly breaks

- **Reflection without hints** (`Class.forName`, `Method.invoke`, JSON/JWT libs) — register in `backend/src/main/java/pro/duelme/backend/config/NativeImageHints.java` (see `nimbus-jose-jwt` entries).
- **Static initializers touching I/O / network / randomness / runtime class graphs.** GraalVM runs `<clinit>` at build time by default. If a class must defer, add `--initialize-at-run-time=fqcn` to `graalvmNative.binaries.named("main").buildArgs` in `backend/build.gradle.kts` (see Bouncy Castle DRBG).
- **Runtime classpath / resource scanning** (`getResources("META-INF/services/...")`, codegen libs) — needs explicit resource hints.
- **New dependencies** — check the [GraalVM Reachability Metadata Repository](https://www.graalvm.org/native-image/libraries-and-frameworks/) first. Heavy crypto / serialization / dynamic-proxy libs usually need explicit `--initialize-at-build-time` settings (e.g. `web3j`, `bouncycastle`).

### Before merging to main, verify locally

```bash
cd backend
./gradlew nativeCompile                       # ~5-10 min
./build/native/nativeCompile/duelme-backend   # smoke-test boot
```

If it fails, fix it. **Never** silence failure by deleting hints, weakening build-time init, dropping the `backend-native` job, or merging anyway.

## Architecture Decisions

### Wallet Integration
- `createConfig` must be imported from `@privy-io/wagmi`, NOT `wagmi`
- `setActiveWalletForWagmi` prop on `<WagmiProvider>` ensures Privy embedded wallet beats MetaMask
- Chain switching via wagmi's `useSwitchChain` (not Privy's `switchChain`)

### Transaction Pattern
Write ops: check chain → check allowance → approve if needed → execute. `createDuel` generates a private invite secret client-side and sends only its hash on-chain; `joinDuel`/`declineDuel` use the secret. Payouts are pull-based — terminal duel flows expose claimable balances, never push transfers.

### Data Fetching
- wagmi `useReadContract` / `useReadContracts` (multicall) for on-chain reads
- React Query with `refetchInterval: 10_000, staleTime: 0` for live data
- Always `refetch()` + `reset()` after successful write transactions
- Header / wallet balances use `frontend/src/lib/balanceRefresh.ts` event bus + 30s poll fallback

### Backend
- Java 25 + Spring Boot 4.0.3, Gradle 9.4 (Kotlin DSL), MongoDB (Spring Data with auditing)
- Privy JWT auth via JWKS — wallet address from `linked_accounts` claim
- Flapdoodle embedded MongoDB for tests — no external DB in CI
- GraalVM Native Image via `org.graalvm.buildtools.native`; JDK 25 (Compact Object Headers, Generational ZGC, Virtual Threads)
- `NativeImageHints.java` registers reflection hints for `nimbus-jose-jwt`

### Deployment
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
- Caddy on host: TLS + reverse proxy (`/api/v1/*` → backend, rest → frontend). Configs: `ops/caddy/{dev.duelme.pro,duelme.pro}.Caddyfile`.

### Smart Contract
- Solidity 0.8.34, OpenZeppelin (SafeERC20, ReentrancyGuard, Pausable, Ownable)
- All state-mutating functions: `nonReentrant` + `whenNotPaused`
- USDT 6 decimals — `wagerAmount` stored raw (`5_000_000` = 5 USDT)
- Pull-based payouts/refunds via `claimPayout(uint256)` / `claimPayouts(uint256[])`
- Mutual cancellation: `MutualCancelRequested` / `MutuallyCancelled`
- Duel messages on-chain as UTF-8 `string`, max 32 code points / 128 bytes
- Emergency withdraw: 30-day timelock for USDT; non-USDT rescue is instant

## Key Files

| File | Purpose |
|------|---------|
| `contracts/src/DuelMe.sol` | Core duel contract |
| `frontend/src/lib/wagmi.ts` | wagmi config (Privy adapter) |
| `frontend/src/lib/contracts.ts` | ABI, DuelState enum, ACTIVE_STATES, ERC20 ABIs, getUsdtAddress |
| `frontend/src/lib/constants.ts` | Chain configs, contract addresses, ZERO_ADDRESS, CHAIN_NAMES |
| `frontend/src/components/providers/Providers.tsx` | Privy + wagmi + QueryClient providers |
| `frontend/src/hooks/useDuel.ts` | Read single duel |
| `frontend/src/hooks/useDuelActions.ts` | Write actions (join, cancel, claim, refundAndClaim, etc.) |
| `frontend/src/hooks/useDashboardClaims.ts` | Dashboard claim/refund handlers and computed state |
| `frontend/src/hooks/usePlayerDuels.ts` | Multicall all duels, filter by player |
| `frontend/src/hooks/usePlatformStats.ts` | Landing-page Total Volume / Duels Played stats |
| `frontend/src/hooks/useRecentDuels.ts` | Landing-page duel feed (newest-first) |
| `frontend/src/hooks/useReputation.ts` | Wilson Score reputation calculation |
| `frontend/src/hooks/useReputationLevels.ts` | Batch reputation reads for feed/search |
| `frontend/src/lib/invite.ts` | Secure invite-secret generation/storage |
| `frontend/src/lib/duelMessage.ts` | Frontend Unicode duel-message validation |
| `frontend/src/lib/duelSearch.ts` | Shared visible-field search indexing |
| `frontend/src/lib/actionFlowConfigs.ts` | Guided transaction flow configs for duel actions |
| `frontend/src/lib/balanceRefresh.ts` | Shared client-side balance refresh event bus |
| `frontend/src/lib/buildTransactionParams.ts` | Builds explicit `gas`/`maxFeePerGas`/`maxPriorityFeePerGas`/`nonce` to bypass Privy auto-populate (see Common Pitfalls) |
| `frontend/src/lib/resilientBroadcast.ts` | Splits writes into sign + broadcast so wagmi fallback transport handles RPC retries |
| `frontend/src/lib/sponsoredTransactionConfig.ts` | Pimlico gas-sponsorship config (env → API key + per-chain sponsorship policy) + sponsored-write allowlist |
| `frontend/src/lib/sponsoredTransactions.ts` | Sends gasless duel writes via Pimlico paymaster + EIP-7702 (permissionless), keeping the EOA address |
| `frontend/src/lib/testnetGas.ts` | Testnet vs mainnet gas/fee buffers; min-gas constants per duel action |
| `frontend/src/lib/wagmi.ts` (`resolveRpcUrl`) | RPC URL env validation + fallback chain (Alchemy/QuickNode → Tenderly) |
| `frontend/src/i18n/translations.ts` | EN/RU translations |
| `scripts/sync_readme_contract_addresses.py` | Sync README contract block from `run-latest.json` |
| `backend/src/.../controller/ProfileController.java` | Profile CRUD endpoints |
| `backend/src/.../security/PrivyJwksService.java` | Privy JWT verification via JWKS |
| `backend/src/.../security/PrivyJwtAuthenticationFilter.java` | Bearer token → wallet auth filter |
| `backend/src/.../exception/GlobalExceptionHandler.java` | Centralized error handling (404, 403, 400) |
| `backend/src/.../model/Profile.java` | MongoDB profile document (record) |
| `frontend/src/lib/profile.ts` | Profile types and validation constants |
| `frontend/src/lib/profileApi.ts` | Backend profile API client |
| `frontend/src/hooks/useMyProfile.ts` | Current user's profile (read/write) |
| `frontend/src/hooks/useProfile.ts` | Read any player's profile by wallet |
| `frontend/src/hooks/useNicknames.ts` | Batch nickname resolution for duel feeds |
| `frontend/src/components/duel/CopyableAddress.tsx` | Address display with copy + profile link |
| `frontend/src/app/profile/page.tsx` | Own profile page |
| `frontend/src/app/profile/[walletAddress]/page.tsx` | Public profile page |
| `frontend/src/components/profile/SocialLinksSection.tsx` | Own-profile connected-accounts section |
| `frontend/src/components/profile/SocialLinksDisplay.tsx` | Public-profile read-only social pills |
| `frontend/src/components/profile/OAuthCallbackHandler.tsx` | Reads `?steam=`/`?telegram=` query and toasts |
| `frontend/src/hooks/useSocialLinks.ts` | Social-link mutations (initiate + set/unlink) |
| `backend/src/.../controller/SocialLinkController.java` | Social-link endpoints `/profiles/me/social/**` |
| `backend/src/.../service/SocialLinkService.java` | Social-link orchestrator (Steam, Telegram, Instagram) |
| `backend/src/.../service/TelegramJwksService.java` | Verifies Telegram OIDC ID tokens via cached JWKS |
| `backend/src/.../service/TelegramOidcService.java` | Telegram OIDC auth URL + token exchange (PKCE S256) |
| `backend/src/.../service/SteamOpenIdService.java` | Steam OpenID 2.0 login + `check_authentication` |
| `backend/src/.../service/SocialLinkStateService.java` | Server-side OAuth state store (wallet + PKCE verifier, TTL-indexed in Mongo) |
| `backend/Dockerfile` | Backend container (multi-stage, GraalVM native) |
| `frontend/Dockerfile` | Frontend container (multi-stage, Node 22) |
| `.github/workflows/ci.yml` | CI pipeline: test + deploy (dev & prod) |
| `ops/docker-compose.{dev,prod}.yml` | Compose stacks |
| `ops/caddy/{dev.duelme.pro,duelme.pro}.Caddyfile` | Caddy reverse proxy |

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

## Development Standards

### General Principles

- **File size:** ≤300 lines. Extract helpers/sub-components/composable hooks when approaching the limit. One file = one purpose (SRP).
- **DRY:** single source of truth for every constant/type/helper/ABI. See `constants.ts` / `contracts.ts`.
- **YAGNI:** build what the task requires. No abstractions for hypothetical futures. Three similar lines beats a premature abstraction.
- **Fail fast:** validate at system boundaries (user input, API, contract calls). Inside, trust the types. Never silently swallow errors.
- **Self-review before "done":** `npx tsc --noEmit` · `npm run lint` · relevant tests (`forge test`, `./gradlew test`, `npm run test`) · read the diff for debug code / missing error handling / inconsistent naming.

### Frontend (Next.js / React / TS / Tailwind)

**Mobile-first — non-negotiable.** Treat mobile as primary, not afterthought. Design at 360–640px first; `sm:`/`md:`/`lg:` are enhancements.
- Tap targets ≥44×44px. No horizontal scroll at 360px. No hover-only affordances.
- Multi-column layouts need explicit mobile fallback (usually vertical stack).
- Fixed elements respect browser chrome / safe areas.
- Always check mobile rendering when reviewing UI diffs.

**UI verification (Playwright + screenshots)** for any layout / visual / responsive / interactive change:
1. `npm run lint && npm run build` from `frontend/`.
2. Start fresh dev server on a free port — don't trust an existing `3001`/`3002`. Example: `npm run dev -- --hostname 127.0.0.1 --port 3010`.
3. Install Chromium once if missing: `npx playwright install chromium`.
4. Run relevant e2e when present: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010 npx playwright test e2e/<file>.spec.ts`. Report unrelated failures explicitly.
5. Screenshot desktop + mobile (`--viewport-size=390,844`) with `--wait-for-timeout=3000 --full-page` to avoid first-frame loading screenshots.
6. Inspect screenshots — check overlapping text, clipped buttons, horizontal scroll, broken spacing, primary action visibility.
7. Clean up: delete screenshots and stop temporary dev server unless user asked you to leave them.

**Components:**
- Functional + hooks only. `function` keyword (not arrow). Named exports only.
- TypeScript strict — no `any`, no unchecked `as`. Use type guards / Zod for unknown data.
- Props interface `{ComponentName}Props` directly above component.
- One exported component per file (small internal helpers <30 lines are fine). Guard clauses first, happy path last.
- Extract reusable logic to `hooks/`, pure logic to `lib/`.
- `'use client'` only when browser APIs needed. Server components by default.
- No barrel files (`index.ts` re-exports) in component dirs — breaks tree-shaking.

**Hooks:**
- Named `use{Feature}`, one concern each. Return objects (not arrays) for >2 values.
- Contract reads via `useReadContract` / `useReadContracts` with explicit `query` config (`enabled`, `refetchInterval`, `staleTime`).
- Memoize expensive computations (`useMemo`) and child callbacks (`useCallback`).
- No async directly in `useEffect` — extract to a function or use React Query.

**State:** URL state for nav-relevant; `useState` for ephemeral UI; React Query for server/contract (never manually sync remote data into `useState`); Context only for cross-cutting concerns.

**Styling:** Tailwind utility classes only — no inline styles, no CSS modules. Use `cn()` from `lib/utils.ts`. shadcn/ui as base, customize via Tailwind. Design tokens via Tailwind theme — never hardcode colors/spacing/breakpoints.

**Errors:** `try/catch` around wallet/API calls. Toast errors via `useAppToast()` — no silent failures. Parse contract reverts to human-readable. Check `res.ok` before parsing API responses.

**Performance:** `next/dynamic` + `{ ssr: false }` for wallet-dependent UI. `useMemo` for derived lists. Don't create objects/arrays in render. `next/image` with explicit width/height + `loading="lazy"` for below-fold.

**i18n:** All visible strings via `useTranslation()`. Add EN + RU keys in `translations.ts`. ICU message format for plurals/interpolation.

**Naming:** Components `PascalCase.tsx`, hooks `camelCase.ts` prefixed `use`, utils `camelCase.ts`, primitive constants `UPPER_SNAKE_CASE`, object constants `camelCase`, types `PascalCase` (prefer `interface` for object shapes).

### Backend (Java / Spring Boot / MongoDB)

**Layer separation:**
- **Controller**: HTTP mapping / validation / response shaping only. ≤50 lines/method. No business logic.
- **Service**: business logic, authorization, transaction boundaries. Controllers never call repositories directly.
- **Repository**: data access only.
- **DTO**: separate request/response records. Never expose Mongo documents. Never reuse the same record for request and response.
- **Exception**: domain-specific, handled in `GlobalExceptionHandler`. Never catch generic `Exception`.
- No circular service dependencies — extract shared logic into a third service.

**Records & immutability:** `record` for all DTOs, value objects, Mongo documents. No setters/mutables. Compact constructor for validation. Constructor injection only (no `@Autowired` on fields, single constructor). No Lombok. `var` when type is obvious.

**Validation:** `@Valid` on `@RequestBody`. `@Validated` on controller class + `@NotBlank` / `@Size` on `@RequestParam` / `@PathVariable`. Wallet addresses always `.toLowerCase()` at service boundary. Max-length on all user string inputs.

**Exceptions:** domain exceptions extend `RuntimeException`. `GlobalExceptionHandler` maps `*NotFoundException` → 404, `NotAuthorizedException` → 403, `ConstraintViolationException` / `MethodArgumentNotValidException` → 400. Never return stack traces in API responses.

**Security:** all mutating endpoints require `@AuthenticationPrincipal`. Authorization checks in service layer (verify ownership). No default values for secrets in `application.yml` — all via env vars from GitHub secrets. Consider rate-limiting batch endpoints.

**API documentation (MANDATORY)** — every endpoint needs OpenAPI annotations.

When **adding** an endpoint:
1. `@Tag(name, description)` on controller class
2. `@Operation(summary)` on method
3. `security = @SecurityRequirement(name = "bearer")` if authenticated
4. `@ApiResponses` with all relevant codes (200, 400, 401, 403, 404)
5. `@Parameter(hidden = true)` on `@AuthenticationPrincipal`
6. Register in `SecurityConfig.java` with `.permitAll()` / `.authenticated()`

When **modifying**: update `@Operation`, security annotations, and `SecurityConfig`.

OpenAPI config: `backend/src/.../config/OpenApiConfig.java`. Swagger UI at `/api/v1/swagger-ui` on each env.

### Smart Contracts (Solidity / Foundry)

**Security-first:**
- Every state-mutating function: `nonReentrant` + `whenNotPaused`. No exceptions.
- `SafeERC20` for all token ops — never raw `.transfer()` / `.transferFrom()`.
- CEI pattern: checks → effects → interactions.
- `onlyOwner` for admin; verify authorization before state changes.
- Never trust `msg.value` arithmetic — use explicit amount params.
- Pull-over-push for payouts.

**Gas:**
- Don't initialize storage to defaults (0, `address(0)`, false).
- `calldata` (not `memory`) for read-only params.
- Pack struct storage variables by size.
- `uint256` for loop counters.
- Events for non-on-chain data.
- `immutable` for constructor-set, `constant` for compile-time literals (eliminates SLOAD).
- Cache repeated storage reads in locals (each SLOAD = 100 gas).
- Short-circuit `require`: cheapest check first.

**Testing:** unit test every public/external function (happy + all revert conditions). Access control, state transitions, boundaries (0 / threshold / max), full lifecycle integration. Fuzz arithmetic-heavy fns. Target ≥90% line coverage including emergency/admin.

**Docs:** NatSpec `@notice` on all public functions. `@param` / `@return` for non-obvious. Emit events for every state change.

**ABI sync:** after contract changes, `forge build` → copy ABI to `frontend/src/lib/contracts.ts` → verify frontend type-checks clean.

### Testing

- **New feature:** tests alongside or immediately after.
- **Bug fix:** failing reproduction test first, then fix.
- **Refactor:** verify existing tests pass before+after, add coverage for uncovered paths.
- Every public surface (contract fn, REST endpoint, exported hook) must have tests.
- **AAA pattern:** Arrange → Act → Assert. One behavior per test. Name `test{Action}{ExpectedResult}`.

**Frontend (Vitest):** test `lib/` pure logic. Test complex hooks via `renderHook`. Test observable behavior, not implementation. Mock at boundaries.

**Backend (JUnit 5 + Spring Boot Test):** `@SpringBootTest` + `@AutoConfigureMockMvc` + embedded MongoDB. Controller via `MockMvc` (status / shape / auth). Service for logic / auth / edges. `WalletAuthenticationToken` for auth simulation. `@BeforeEach` cleanup for isolation.

**Contracts (Foundry):** one file per area. `setUp()` with standard accounts. `vm.expectRevert` / `vm.expectEmit` / `vm.warp` / `vm.prank`.

**Edge cases always:** zero/max inputs, unauthorized callers, double-execution, empty / boundary-length strings, reentrancy.

**Coverage:** Contracts ≥90%. Backend: all endpoints + service methods (focus auth/validation). Frontend: all `lib/` pure functions.

### Documentation

- **CLAUDE.md:** keep synced with code in the same commit. Key Files table: add new important files, remove deleted ones. Add non-obvious gotchas to Common Pitfalls.
- **Code comments:** explain "why", never "what". Use for non-obvious business rules, external-bug workarounds, performance-critical decisions. TODO comments banned in committed code — file an issue.
- **Commit messages:** imperative mood, first line ≤72 chars, body for non-obvious context. Never add `Co-Authored-By` or any AI attribution.

### Subagent Quality Requirements

**Subagents do NOT receive CLAUDE.md automatically.** Every Agent prompt must begin with:

> "Read /home/oserver/projects/duelme/CLAUDE.md first — it contains project conventions, development standards, and quality requirements you must follow."

And must require:
- **Context loading:** read CLAUDE.md and relevant source files before writing code.
- **Code quality:** follow existing patterns; no duplicated constants, oversized functions, or `any` types; must pass `npx tsc --noEmit`, `npm run lint`, `forge build`, `./gradlew build`; handle errors at boundaries.
- **Tests:** any subagent that writes implementation code also writes tests.
- **Self-review:** re-read modified files for inconsistencies / unused imports / dead code / debug statements; confirm naming matches conventions; run relevant tests.

## Environment

Runtime config source of truth: GitHub repository/environment secrets. Deploy workflow writes them into `~/apps/duelme-{dev,prod}/.env` over SSH before `docker compose up`. When adding a new runtime variable, update `.github/workflows/ci.yml`, the matching `ops/docker-compose.*.yml`, and this list.

- `NEXT_PUBLIC_PRIVY_APP_ID` — Privy app ID (frontend)
- `PRIVY_APP_ID` — Privy app ID (backend JWT verification)
- `MONGODB_URI` — Mongo connection (default `mongodb://localhost:27017/duelme`). Spring Boot 4 property: `spring.mongodb.uri` (not `spring.data.mongodb.uri`).
- `NEXT_PUBLIC_API_URL` — Backend API base URL (default `/api/v1`)
- `NEXT_PUBLIC_ARBITRUM_RPC_URL` — authenticated RPC for Arbitrum One (Alchemy/QuickNode). Used as Privy embedded-wallet override + first wagmi fallback. Falls back to Tenderly Gateway public if unset. Lock URL via provider dashboard "Allowed Origins" — `NEXT_PUBLIC_*` are inlined into the JS bundle.
- `NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL` — same for Arbitrum Sepolia. Optional; Tenderly public works for dev.
- `NEXT_PUBLIC_PIMLICO_API_KEY` — Pimlico app API key for gasless duel actions (EIP-7702 + sponsored paymaster). Per environment (dev/prod). Unset ⇒ sponsorship off, writes fall back to the ETH-gas path. `NEXT_PUBLIC_*` is inlined into the bundle.
- `NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM` — Pimlico sponsorship policy id for Arbitrum One (prod build, mainnet needs Pimlico balance funding). Set per-spender + total spend caps on the policy — the key is public, so policy limits are the real abuse control.
- `NEXT_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID_ARBITRUM_SEPOLIA` — same for Arbitrum Sepolia (dev build). Testnet sponsorship is free.
- `APP_BASE_URL` — backend's view of frontend origin for OAuth redirects (`https://dev.duelme.pro` / `https://duelme.pro`)
- `STEAM_API_KEY` — optional; enables username/avatar enrichment via `GetPlayerSummaries`
- `STEAM_RETURN_URL` — absolute Steam callback URL (`https://{env}/api/v1/profiles/me/social/steam/callback`)
- `TELEGRAM_CLIENT_ID` / `TELEGRAM_CLIENT_SECRET` — OIDC creds from @BotFather → Bot Settings → Web Login
- `TELEGRAM_RETURN_URL` — absolute Telegram callback URL; must match @BotFather-registered URL
- `TELEGRAM_ISSUER` — defaults to `https://oauth.telegram.org`
- Chains: Arbitrum One (42161) prod, Arbitrum Sepolia (421614) dev. Build-time `NEXT_PUBLIC_DEFAULT_CHAIN_KEY` (`arbitrum` / `arbitrumSepolia`) selects.
- Contract addresses: `DUELME_ADDRESSES` map in `constants.ts`.

## Common Pitfalls

- `createConfig` from `wagmi` instead of `@privy-io/wagmi` silently breaks wallet routing.
- `useSetActiveWallet` in `useEffect` is too late — use `setActiveWalletForWagmi` sync callback.
- Invite-only duels rely on the full private link (URL fragment) — never fall back to plain `/duel/{id}`.
- USDT has a blocklist — keep payouts pull-based, no push transfers.
- Wilson Score gives low scores for small samples — players with 0 abandoned duels are never "unreliable".
- Only `contracts/broadcast/{Deploy,DeployMainnet}.s.sol/<chainId>/run-latest.json` is tracked; timestamped `run-*.json` ignored via top-level `.gitignore`.
- **Do NOT use `arbitrum-one-rpc.publicnode.com`** — exposes legacy `eth_fillTransaction`, which viem 2.47+ calls during `prepareTransactionRequest` and gets `gasPrice: "0x0"`, producing signed txs with all-zero gas/fees. Privy surfaces as "HTTP request failed". See [viem#4323](https://github.com/wevm/viem/issues/4323) (open as of May 2026). Use Alchemy/QuickNode/Tenderly/drpc/arb1.arbitrum.io.
- **Privy embedded wallets** sign with all-zero gas/nonce when SDK auto-populates — bypass by passing `gas` / `maxFeePerGas` / `maxPriorityFeePerGas` / `nonce` explicitly in every `writeContract` call. Centralized in `useDuelActions.writeWithGas` (uses `buildTransactionParams` + `resilientBroadcast`) — never call `writeContract` directly from action functions.
- **Gasless duel actions (Pimlico + EIP-7702):** when `NEXT_PUBLIC_PIMLICO_*` is configured, Privy embedded-wallet writes route through `sendSponsoredContractWrite` (Pimlico paymaster), signing the 7702 delegation via Privy's `useSign7702Authorization` and keeping the EOA address (so reputation/balances stay keyed to it). Unset env ⇒ silently falls back to the explicit-gas `writeWithGas` path above. The client-side `isSponsoredWriteAllowed` allowlist is UX hygiene only — the public bundle key means Pimlico policy spend caps are the actual abuse control.
- **`permissionless` + `ox` peer clash:** `permissionless@0.2.x` declares an *optional* peer `ox@^0.8.0` that conflicts with viem 2.47's `ox@0.14.5`. Resolved by pinning `ox` in `frontend/package.json` `overrides`. Don't remove it — `npm ci` will ERESOLVE.
- **CSP `connect-src` must allowlist every external host the frontend calls** — otherwise the browser silently blocks the `fetch` ("Refused to connect ... Content Security Policy"). Set in the `Content-Security-Policy` header in `ops/caddy/{dev.duelme.pro,duelme.pro}.Caddyfile`. Must include Pimlico (`https://api.pimlico.io`) and the RPC fallback chain from `wagmi.ts` (`https://gateway.tenderly.co`, `https://*.drpc.org`, `arb1.arbitrum.io`, `sepolia-rollup.arbitrum.io`) — plus any custom `NEXT_PUBLIC_*_RPC_URL` host (e.g. `*.g.alchemy.com`). The **live** `/etc/caddy/Caddyfile` is a hand-maintained combined file (other sites too) and is **NOT** auto-deployed by CI — edit it on the host and `sudo systemctl reload caddy` (the repo `ops/caddy/*` files are the reference copy).
- README contract addresses auto-generated from `run-latest.json` by `scripts/sync_readme_contract_addresses.py` / pre-commit hook — don't edit that block manually.
- Manual deploys here: source `contracts/.env` first (`set -a && . ./.env && set +a`).
- Use shared constants from `constants.ts` (`ZERO_ADDRESS`, `CHAIN_NAMES`) and `contracts.ts` (`ACTIVE_STATES`, `balanceOfAbi`, `transferAbi`, `getUsdtAddress`) — never redefine locally.
- `PRIVY_APP_ID` env required for backend (no default in `application.yml`).
- Frontend npm pinned to `^11.12.1` via `frontend/package.json` `engines` + `frontend/.npmrc` `engine-strict=true`. CI / Dockerfile install via `npm install -g npm@11.12.1`. Mismatch caused `EUSAGE` / `EBADENGINE` in `npm ci`.
- `overrides.eslint-plugin-react-hooks: 7.0.1` is a temporary pin — `7.1.x` adds `react-hooks/set-state-in-effect`, which flags existing patterns in `dashboard/page.tsx`, `duel/[id]/page.tsx`, `Header.tsx`, `useCreateDuelFlow.ts`, `useJoinDuelFlow.ts`. Lift only after refactoring those files.

Source of truth for current deploys: `contracts/broadcast/Deploy.s.sol/421614/run-latest.json` (Arbitrum Sepolia / dev) and `contracts/broadcast/DeployMainnet.s.sol/42161/run-latest.json` (Arbitrum One / prod), mirrored into `README.md` and `frontend/src/lib/constants.ts`.
