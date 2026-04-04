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
- Do not push unless explicitly asked
- Do not amend existing commits unless explicitly asked
- See [Documentation Standards](#documentation-standards) for commit message format

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
| `frontend/src/lib/contracts.ts` | ABI, DuelState enum, ACTIVE_STATES, ERC20 ABIs, getUsdtAddress |
| `frontend/src/lib/constants.ts` | Chain configs, contract addresses, ZERO_ADDRESS, CHAIN_NAMES |
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

## Development Standards

### General Principles

**File size discipline:** No source file should exceed 300 lines. When a file approaches this limit, proactively extract logical units into separate files — helper functions into utilities, sub-components into their own files, complex hooks into composable hooks. A file doing too many things is a bug waiting to happen. Apply the Single Responsibility Principle at the file level: one file = one clear purpose.

**DRY — Single Source of Truth:** Every constant, type, helper, and ABI must have exactly one canonical definition. Import from the source. Never copy-paste a value "just for this file." If you find yourself defining the same thing in two places, extract it immediately. See `constants.ts` and `contracts.ts` for shared definitions.

**YAGNI — Build What's Needed:** Do not add features, parameters, configuration options, or abstractions for hypothetical future use. Build what the task requires. Three similar lines are better than a premature abstraction. Add abstractions only when the third concrete use case demands it.

**Fail fast, fail clearly:** Validate at system boundaries (user input, API requests, contract calls). Inside the system, trust the types and let errors surface naturally. Never silently swallow errors — either handle them with user-facing feedback or let them propagate.

**Self-review before completion:** Before declaring any task done, always:
1. Run the type-checker (`npx tsc --noEmit`)
2. Run the linter (`npm run lint`)
3. Run relevant tests (`forge test`, `./gradlew test`, `npm run test`)
4. Read through the diff — look for accidental debug code, missing error handling, inconsistent naming

---

### Frontend Standards (Next.js / React / TypeScript / Tailwind)

**Component architecture:**
- Functional components only, with hooks for all state and side effects
- Use `function` keyword for components, not `const` arrow functions. Named exports only — no default exports
- TypeScript strict mode — no `any`, no `as` casts without validation. Use type guards or Zod when narrowing unknown data
- Props interfaces defined directly above the component, named `{ComponentName}Props`
- One exported component per file. Internal helper components are fine if small (<30 lines)
- Guard clauses first, happy path last — no deeply nested `if/else` trees. Early return for every error condition
- Extract reusable logic into custom hooks in `hooks/`. Extract pure logic into `lib/`
- Use `'use client'` directive only on components that need browser APIs. Keep server components as default
- Never use barrel files (`index.ts` re-exports) in component directories — they break tree-shaking

**Hooks patterns:**
- Name custom hooks `use{Feature}` — each hook should own one concern
- Return objects (not arrays) for hooks with >2 return values: `{ data, isLoading, refetch }`
- For contract reads: use `useReadContract` / `useReadContracts` with explicit `query` options
- Always specify `enabled`, `refetchInterval`, and `staleTime` in query config
- Memoize expensive computations with `useMemo`. Memoize callbacks passed to children with `useCallback`
- Never put async calls directly in `useEffect` — extract to a function or use React Query

**State management:**
- URL state for navigation-relevant state (active tab, filters)
- React state (`useState`) for ephemeral UI state (modals, form inputs)
- React Query for server/contract state — never manually sync remote data into `useState`
- Context only for cross-cutting concerns (theme, language, wallet) — not for data fetching

**Styling:**
- Tailwind CSS utility classes for all styling. No inline styles, no CSS modules
- Use `cn()` from `lib/utils.ts` for conditional class merging (clsx + tailwind-merge)
- shadcn/ui components as the base. Customize via Tailwind, not by overriding component internals
- Responsive-first: mobile layout is default, `md:` / `lg:` for larger breakpoints
- Design tokens via Tailwind theme — never hardcode colors, spacing, or breakpoints

**Error handling:**
- Use `try/catch` around async operations that interact with wallets or APIs
- Show user-facing toast via `useAppToast()` for all error states — never silent failures
- Contract reverts: parse the error message and show a human-readable explanation
- API errors: check `res.ok` before parsing. Return sensible defaults on failure in hooks

**Performance:**
- Lazy load heavy components with `next/dynamic` and `{ ssr: false }` for wallet-dependent UI
- Use `useMemo` for filtered/sorted lists derived from large datasets
- Avoid re-renders: don't create objects/arrays in render — extract to `useMemo` or module scope
- Images: use `next/image` with explicit width/height. Always set `loading="lazy"` for below-fold

**Internationalization:**
- All user-visible strings go through `useTranslation()` — no hardcoded text in JSX
- Always add both EN and RU keys in `translations.ts` when adding new strings
- Use ICU message format for plurals and interpolation

**Naming conventions:**
- Components: `PascalCase` files and exports (`DuelCard.tsx`)
- Hooks: `camelCase` files prefixed with `use` (`useDuel.ts`)
- Utilities/libs: `camelCase` files (`duelSearch.ts`)
- Constants: `UPPER_SNAKE_CASE` for primitive values, `camelCase` for objects/maps
- Types: `PascalCase`, prefer `interface` over `type` for object shapes

---

### Backend Standards (Java / Spring Boot / MongoDB)

**Layer architecture — strict separation:**
- **Controller**: HTTP mapping, request validation, response shaping. No business logic. Max 50 lines per method
- **Service**: Business logic, authorization checks, transaction boundaries. Controllers call services, never repositories directly
- **Repository**: Data access only. Custom queries via Spring Data method names or `@Query`
- **DTO**: Separate request/response records from domain models. Never expose MongoDB documents directly. Never reuse the same record for both request and response
- **Exception**: Domain-specific exceptions handled in `GlobalExceptionHandler`. Never catch generic `Exception`
- No circular dependencies between services — extract shared logic into a third service if needed

**Java records and immutability:**
- Use `record` for all DTOs, value objects, and MongoDB documents
- Never use mutable fields or setters. Build new instances for modifications
- Constructor validation via compact constructor for domain constraints
- Constructor injection only — no `@Autowired` on fields. Single constructor per class (Spring auto-injects)
- No Lombok — Java records and modern language features cover the same ground
- Use `var` for local variables when the type is obvious from the right side

**Input validation:**
- `@Valid` on all `@RequestBody` parameters. Jakarta Bean Validation annotations on DTO fields
- `@Validated` on controller class + `@NotBlank` / `@Size` on `@RequestParam` / `@PathVariable`
- Wallet addresses: always `.toLowerCase()` at the service boundary. Store normalized
- Sanitize and limit string inputs: max length on all user-provided text fields

**Exception handling:**
- Domain exceptions extend `RuntimeException` with descriptive messages
- `GlobalExceptionHandler` maps exceptions to HTTP status codes:
  - `*NotFoundException` → 404
  - `NotAuthorizedException` → 403
  - `ConstraintViolationException` / `MethodArgumentNotValidException` → 400
- Never return stack traces in API responses. Log them server-side only

**Security:**
- All mutating endpoints require authentication (`@AuthenticationPrincipal`)
- Authorization checks in service layer: verify the caller owns/created the resource
- No default values for secrets in `application.yml` — all secrets via env vars
- Rate limiting consideration for batch endpoints

**API documentation (MANDATORY):**
Every endpoint must have complete OpenAPI annotations. This is a blocking requirement.

When **adding** a new endpoint:
1. `@Tag(name = "...", description = "...")` on the controller class
2. `@Operation(summary = "...")` on the method
3. `security = @SecurityRequirement(name = "bearer")` if authenticated
4. `@ApiResponses` with all relevant response codes (200, 400, 401, 403, 404)
5. `@Parameter(hidden = true)` on `@AuthenticationPrincipal`
6. Register in `SecurityConfig.java` with `.permitAll()` or `.authenticated()`

When **modifying** an existing endpoint: update `@Operation`, security annotations, and `SecurityConfig` as needed.

OpenAPI config: `backend/src/.../config/OpenApiConfig.java`
Swagger UI: `https://dev.duelme.pro/api/v1/swagger-ui` (dev) / `https://duelme.pro/api/v1/swagger-ui` (prod)

---

### Smart Contract Standards (Solidity / Foundry)

**Security-first development:**
- Every state-mutating function: `nonReentrant` + `whenNotPaused`. No exceptions
- Use `SafeERC20` for all token operations. Never use raw `.transfer()` / `.transferFrom()`
- CEI pattern (Checks-Effects-Interactions): validate inputs → update state → external calls
- Access control: `onlyOwner` for admin functions. Authorization checks before state changes
- Never trust `msg.value` arithmetic — use explicit amount parameters
- Pull-over-push for payouts: let users claim, never push funds to arbitrary addresses

**Gas optimization:**
- Don't initialize storage variables to their default values (0, address(0), false)
- Use `calldata` instead of `memory` for read-only function parameters
- Pack storage variables: group smaller types together in struct definitions
- Prefer `uint256` for loop counters and intermediate calculations
- Use events for data that doesn't need on-chain access
- `immutable` for constructor-set values, `constant` for compile-time literals (eliminates SLOAD)
- Cache storage reads in local variables — each repeated SLOAD costs 100 gas
- Short-circuit `require` checks: cheapest check first

**Testing strategy:**
- Unit tests for every public/external function — happy path + all revert conditions
- Test access control: verify `onlyOwner` reverts for non-owners
- Test state transitions: verify each state can only transition to valid next states
- Boundary tests: exact thresholds, zero values, max values
- Integration tests: full lifecycle flows (create → join → claim → confirm → payout)
- Fuzz tests for arithmetic-heavy functions when applicable
- Target: >90% line coverage. Emergency/admin functions included

**Documentation:**
- NatSpec `@notice` on all public functions
- `@param` and `@return` for non-obvious parameters
- Emit events for every state change — frontends depend on these

**ABI sync:** After any contract change, regenerate ABI and sync to `frontend/src/lib/contracts.ts`. Run `forge build` → copy ABI → verify frontend type-checks clean.

---

### Testing Standards

**When to write tests:**
- New feature: write tests alongside or immediately after implementation
- Bug fix: write a failing test that reproduces the bug first, then fix
- Refactoring: verify existing tests pass before and after. Add tests for uncovered paths
- Every public API surface (contract function, REST endpoint, exported hook) must have tests

**Test structure — AAA pattern:**
```
Arrange → set up preconditions and inputs
Act     → execute the operation under test
Assert  → verify the expected outcome
```
One behavior per test. Name tests descriptively: `test{Action}{ExpectedResult}` or `{action} {expected result}`.

**Frontend tests (Vitest):**
- Test pure logic in `lib/` (formatting, validation, search) — these are fast and valuable
- Test hook behavior with `renderHook` for complex hooks
- No testing of implementation details — test observable behavior
- Mock external dependencies (contract reads, API calls) at the boundary

**Backend tests (JUnit 5 + Spring Boot Test):**
- `@SpringBootTest` + `@AutoConfigureMockMvc` + embedded MongoDB for integration tests
- Test controller layer through `MockMvc` — verify HTTP status, response shape, auth enforcement
- Test service layer for business logic, authorization, edge cases
- Use `WalletAuthenticationToken` for simulating authenticated requests
- `@BeforeEach` cleanup: delete all documents to ensure test isolation
- Test validation: verify 400 responses for invalid inputs

**Contract tests (Foundry):**
- One test file per logical area (core, payouts, emergency)
- Use setUp() with standard test accounts (creator, opponent, attacker, owner)
- Test all revert conditions with `vm.expectRevert`
- Test events with `vm.expectEmit`
- Use `vm.warp` for time-dependent logic (timeouts, timelocks)
- Use `vm.prank` for access control tests

**Edge cases to always check:**
- Zero-value and max-value inputs
- Unauthorized callers (wrong wallet, no auth token)
- Double-execution (claim twice, join twice, cancel after cancel)
- Empty strings and strings at boundary length
- Reentrancy (contracts have `nonReentrant`, but test that it actually blocks)

**Coverage expectations:**
- Contracts: >90% line coverage (`forge coverage --report summary`)
- Backend: all endpoints + all service methods tested, focus on auth + validation paths
- Frontend: all `lib/` pure functions tested

---

### Documentation Standards

**CLAUDE.md maintenance:**
- Keep in sync with code reality. When changing architecture, update CLAUDE.md in the same commit
- Key Files table: add new files, remove deleted ones. Every important file should be listed
- Common Pitfalls: add any non-obvious gotcha discovered during development
- Done section: update after completing major features

**Code comments:**
- Don't comment obvious code. Comments explain "why", never "what"
- Use comments for: non-obvious business rules, workarounds for external bugs, performance-critical decisions
- TODO comments are banned in committed code — file an issue instead

**Commit messages:**
- Imperative mood: "Add X" not "Added X" or "Adds X"
- First line: what changed and why (max 72 chars)
- Body (if needed): context that isn't obvious from the diff
- Never add `Co-Authored-By` or any AI attribution

---

### Subagent Quality Requirements

**IMPORTANT: Subagents do NOT receive CLAUDE.md automatically.** The main agent must explicitly include instructions in every subagent prompt. Every Agent tool call must begin with:

> "Read /home/oserver/projects/duelme/CLAUDE.md first — it contains project conventions, development standards, and quality requirements you must follow."

Additionally, the prompt must include these requirements:

**Context loading:** Read CLAUDE.md and the relevant source files before writing any code. Understand the project patterns, naming conventions, and architectural decisions before touching code.

**Code quality mandate:**
- Follow the project's existing patterns exactly — study neighboring files for style
- Never introduce code smells: no duplicated constants, no oversized functions, no `any` types
- All new code must pass: `npx tsc --noEmit`, `npm run lint`, `forge build`, `./gradlew build`
- Handle errors at system boundaries. No silent failures

**Test coverage:** Every subagent that writes implementation code must also write tests. No exceptions. If the agent creates a new service method, it writes the test. If it adds a contract function, it writes the test.

**Self-review:** Before completing, the agent must:
1. Re-read all files it modified and check for inconsistencies
2. Verify no unused imports, dead code, or accidental debug statements
3. Confirm naming matches project conventions
4. Run the relevant test suite and verify all tests pass

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
- Use shared constants from `constants.ts` (`ZERO_ADDRESS`, `CHAIN_NAMES`) and `contracts.ts` (`ACTIVE_STATES`, `balanceOfAbi`, `transferAbi`, `getUsdtAddress`) — never redefine locally
- `PRIVY_APP_ID` env var is required for backend — no default value in application.yml

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
