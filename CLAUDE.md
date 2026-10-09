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

**Frontend (`frontend/`):** `npm run dev` (localhost:3000) · `npm run build` · `npm run lint` · `npx tsc --noEmit` · `npm test` (Vitest) · `npm run test:watch`

**Backend (`backend/`):** `./gradlew build` (JDK 25 via toolchain) · `./gradlew bootRun` (localhost:8080, needs MongoDB) · `./gradlew test` (embedded MongoDB via Flapdoodle) · `./gradlew bootJar` · `./gradlew nativeCompile` (~5–10 min, ~50ms startup, ~60MB RSS) · `./gradlew nativeTest` · `docker compose up -d` (local MongoDB)

**Contracts (`contracts/`):** `forge build` · `forge test` · `forge test -vvv` · `forge coverage --report summary`. `test/UsdtPermitFork.t.sol` skips unless `ARBITRUM_RPC_URL` is set — `set -a && . ./.env && set +a` first to include it. Skipped tests there are expected, not a failure.

## Git Conventions

- **Never** run `git add` / `commit` / `push` (or any equivalent like `git commit -a`, `git push --force`, `gh pr create`) unless the user explicitly asks for THAT specific action in their current message. Permission is per-action and per-message; past authorization does not carry forward. Read-only git commands (`status`, `diff`, `log`, `show`) are fine. After changes, stop at the working tree and report the diff — wait before staging/committing/pushing.
- **Never** add `Co-Authored-By` or any Claude attribution to commits.
- Don't amend existing commits unless explicitly asked.
- Commit messages: in English, imperative mood ("Add X" not "Added X"); first line ≤72 chars; body for non-obvious context.
- **PRs** are written in English and open as drafts. Their description opens with the **Quality gates** table from `.github/pull_request_template.md` — how many times each review and check ran on the PR, and what came of it — and it is kept true at the head commit, because the merge decision is made from it. Dependabot's PRs (the bot rewrites their description) and `dev` → `main` releases are exempt from the table and from the loop below.
- **Review loop before a PR is marked ready for review**, in this order. Snapshot the work before every auto-fix — a `git diff --binary HEAD` patch plus copies of untracked files is enough — and re-read what it changed against the spec: auto-fixes have rewritten explicit requirements before. The review commands read the pushed PR, so each round's fixes are pushed (with permission, per the first bullet) before the next round.
  1. `/simplify` once on code changes, with the range named (`/simplify origin/<base>...HEAD`) so that it covers the whole branch, not only uncommitted work.
  2. `/review-pr <n>` once, for this repo's conventions.
  3. `/security-review` when `contracts/src/` or `contracts/script/` changes.
  4. `/code-review high <n>` round after round until a round finds nothing serious — wrong behaviour, or a security, money or data risk. Use `max` when the diff touches `contracts/`, the relayer, permits, payouts or auth, and never `--comment`: findings are triaged before anything reaches the PR. Every finding gets a verdict, fixed or rejected with the reason. Later rounds have caught bugs that earlier fixes introduced, so the clean round's minor findings are recorded rather than fixed, and anything that changes the PR's diff after it — a CI fix, a conflict resolution — gets another round. If a fourth round still finds serious bugs, stop before fixing them and rethink the design.

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
Write ops, relayed: check chain → sign EIP-2612 permit (funding calls only) → sign
ForwardRequest → POST `/api/relay`. Self-paid: check chain → check allowance → approve if
needed → execute. `useWriteWithGas` picks between them from `useRelayerStatus`; `useDuelActions`
binds each duel action on top of it and swaps in the `*WithPermit` variant when the write is
relayed (see "Gasless Duel Actions" below). `createDuel` generates a private invite secret
client-side and sends only its hash on-chain; `joinDuel`/`declineDuel` use the secret. Payouts are
pull-based — terminal duel flows expose claimable balances, never push transfers.

### Data Fetching
- wagmi `useReadContract` / `useReadContracts` (multicall) for on-chain reads
- React Query with `refetchInterval: 10_000, staleTime: 0` for live data. The paged duel readers
  in `useDuelReads.ts` are the exception on both counts: one shared `DUEL_POLL_INTERVAL` of 15s,
  used as `staleTime` too. They read the contract's whole history, so they are the largest
  recurring cost the app has — and `staleTime: 0` made every screen that mounted one download all
  of it again. Player-initiated changes do not wait for the interval; every duel write calls
  `refetch()` on success.
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

### Gasless Duel Actions (ERC-2771)
`DuelMe` trusts one immutable `ERC2771Forwarder`, set at deploy. The client signs an EIP-712
`ForwardRequest`; `/api/relay` verifies it with `forwarder.verify`, refuses anything outside
`RELAYABLE_DUEL_FUNCTIONS`, meters a per-address daily gas budget under a relayer-wide daily ceiling, and sends
`forwarder.execute` with one transaction in flight. Funding uses EIP-2612 —
`createDuelWithPermit` / `joinDuelWithPermit` — so no separate `approve` is needed. There is
no automatic fallback: once `useRelayerStatus` reports relaying on, `useDuelActions` routes
every relayable duel write through `/api/relay` and the guided flows pin `needsApproval` to
false, so a refusal (spent daily budget, `"Permit failed"` on a delegated EOA) surfaces as an
error rather than reverting to the self-paid approve path. Relaying being *off* — no forwarder
address, no relayer key — is the case the self-paid path still covers.

### Smart Contract
- Solidity 0.8.34, OpenZeppelin (SafeERC20, ReentrancyGuard, Pausable, Ownable2Step, ERC2771Context)
- **Every player-facing state-mutating function is `nonReentrant`** — `createDuel*`, `joinDuel*`,
  `declineDuel`, `claimVictory`, `admitDefeat`, the four mutual-cancellation calls,
  `confirmResult`, `disputeResult`, `refund`, `cancelDuel`, and every `claimPayout*` /
  `refundAndClaimPayouts*`. The `onlyOwner` entry points are the deliberate exception and carry no
  guard: `rescueToken`, `rescueETH`, the three emergency-withdraw calls, the five `set*` setters,
  `setDuelCreationPaused`, `pause`, `unpause`, and the `acceptOwnership` override. Their only
  caller is the owner key, so the guard would buy nothing. A new *player-facing* entry point
  without `nonReentrant` is a bug; a new `onlyOwner` one does not need it.
- **Administrative authority is deliberately not relayable.** `_checkOwner` and the
  `acceptOwnership` override both read `msg.sender`, not `_msgSender()`. Otherwise one off-chain
  signature from the owner key could be pushed through the forwarder — by an attacker, paying the
  gas, at a moment of their choosing — to transfer ownership, pause every duel or start an
  emergency withdrawal. Players need the forwarder because they have no ETH; the owner has ETH.
  Keep every new `onlyOwner` path on `msg.sender`.
- `whenNotPaused` is deliberately NOT universal:
  `pause()` blocks entering a duel (create, join, decline) and declaring a new result
  (`claimVictory`, `admitDefeat`); it never blocks withdrawing. Everything that only distributes the two wagers already held —
  `confirmResult`, `disputeResult`, `refund`, `cancelDuel`, the mutual-cancellation flow and every
  claim — stays open. An emergency brake that can hold a won payout indefinitely is a freeze on
  user funds, and a pausable `confirmResult` beside an unpausable `refund` is worse than either:
  the claim window runs out during the pause, the win becomes a refund, and the player who was
  prevented from confirming is the one stamped `duelsAbandoned`.
- **Known limit of that policy:** a `Funded` duel has no *unilateral* exit while paused. Both
  unilateral exits from `Funded` — `claimVictory` and `admitDefeat` — are pausable, so the
  unpausable `refund` is out of reach (it needs `WinnerClaimed`), and the
  mutual-cancellation path needs both players. Two wagers stay escrowed until the pause lifts.
  That is the price of a brake that can actually stop a claim; the alternative — unpausable
  `claimVictory` — means a pause cannot stop an exploit in the claim path at all. Worth revisiting
  only together with what `pause()` is for.
- `setDuelCreationPaused(bool)` is the separate migration switch: creation stops, existing duels
  keep playing and paying out, so moving to a successor address never strands money here.
- USDT 6 decimals — `wagerAmount` stored raw as `uint96` (`5_000_000` = 5 USDT)
- Pull-based payouts/refunds via `claimPayout` / `claimPayouts` / `refundAndClaimPayouts`, each with
  a `*To(…, address to)` sibling. The destination matters because USDT can blacklist an address,
  which would otherwise strand a payout in the contract forever.
- Duel storage is packed into 5 slots (from 16): participant roles are bits (`winnerIsCreator`,
  `claimedByCreator`, …) because every recorded address is either the creator or the opponent, and
  timestamps are `uint40`. External readers still get the flat shape through `DuelView` / `getDuel`.
- **Payouts are derived, never stored.** `_payoutOf` computes them from the terminal state and the
  winner — for `DuelView`, for the claim paths, and for the amount in `DuelResolved`. Do not
  reintroduce a stored payout field: it is the one way a duel's state and its payout can disagree,
  and it would need every writer to remember to keep it true.
- **`DuelState.Nonexistent` holds the enum's zero value**, and `_createDuel` writes
  `state = Created` explicitly (into a slot it already touches, so it is free). Duels live in a
  mapping, so an id nobody issued reads back as a zeroed struct. While `Created` held zero, such a
  slot was a legitimate fully open duel to every reader (`creator == 0`, `inviteHash == 0`,
  `invitedOpponent == 0`): `joinDuel` admitted anyone on it, pulled a zero wager, and left
  `state == Funded` for the real duel that later took the id — which `_createDuel` writes assuming
  a virgin entry. One wager then backed a two-wager payout out of other duels' escrow, and
  `admitDefeat` on that free `Funded` duel minted reputation. Two rules keep it shut:
  **never give `Created` the zero value again**, and route every entry point whose required state
  is `Created` through `_requireWaitingDuel`. The invariant handler draws ids past `duelCount` so
  the suite reaches this (`invariant_nothingExistsPastDuelCount`).
- `PlayerStats.duelsWon` / `duelsLost` / `volume` are written but not yet read — only
  `duelsHonored` and `duelsAbandoned` reach the UI, through the reputation score. Same reasoning
  as `createDuelFor` below: the contract is immutable, the screens are not, and all five counters
  share one storage slot so the unread three cost a few hundred gas per resolution rather than a
  slot. Pending work, not dead state.
- The address-bound half of duels is deliberately **read-only in the app**: `createDuelFor` /
  `createDuelForWithPermit` have no UI, while `usePublicDuels` and the duel page already gate on
  `invitedOpponent`. The entry points shipped now because the contract is immutable; the "challenge
  a specific player" control is the follow-up. Treat the gap as pending work, not a bug.
- `inviteHash == bytes32(0)` marks an open duel — anyone may join. `declineDuel` is refused only
  when the duel is open in *both* senses (no hash **and** no `invitedOpponent`): its invite is
  public, so declining would be a free way to empty the lobby. A non-zero `invitedOpponent`
  (set via `createDuelFor` / `createDuelForWithPermit`) restricts a duel to one address, which may
  decline it with or without a secret. While the duel is still waiting `DuelView.invitedOpponent`
  names that player and `opponent` is zero; once someone joins or declines the roles swap, so
  `opponent` always means "the second player".
  A client must gate its Join/Decline buttons on `invitedOpponent`, not on `inviteHash` alone —
  `isPublicDuel` (in `frontend/src/lib/invite.ts`, not on the contract) only answers "no secret
  needed"; `canPresentInvite` beside it mirrors the contract's `_requireAdmitted`.
- **The wager token is vetted once, at deploy, not on every wager.** `script/TokenFeeProbe.sol`
  moves a probe amount from the deployer to itself and requires the balance back whole; both
  deploy scripts run it. `usdt` is `immutable`, so this is one question about one address — the
  old per-wager balance-delta check asked it twice per create and twice per join, on the path the
  relayer pays for, and only in one direction: payouts leave through a bare `safeTransfer`, so a
  fee switched on later would have reverted intake while still short-paying every outstanding
  claim. That case is now `pause()`'s job, and `testFeeSwitchedOnAfterDeployUnderCollateralisesTheDuel`
  pins what happens without it. Never add a token whose transfer can take a cut.
- `admitDefeat` resolves the duel outright — no confirmation window, one relayed transaction less.
- Batch reads: `getDuels(offset, limit)` and `getDuelsByIds(ids)`; the frontend reads through
  `useDuelReads.ts` in pages of 200 instead of one call per duel.
- Mutual cancellation is four calls — `requestMutualCancellation`, then the counterparty's
  `acceptMutualCancellation` / `declineMutualCancellation`, or the requester's
  `withdrawMutualCancellationRequest`. A decline or a withdrawal returns the duel to `Funded`.
- Duel messages on-chain as UTF-8 `string`, default max 32 code points / 128 bytes
- Two owner exits, and USDT only gets one of them: `rescueToken` moves a stray token out
  instantly but reverts on USDT, `rescueETH` sweeps ETH. USDT can leave only through the
  timelocked `requestEmergencyWithdraw` → `executeEmergencyWithdraw` pair (`emergencyDelay`,
  default and floor 30 days), which accepts any token. So escrowed wagers are never one owner
  transaction away.
- Owner-settable params with hardcoded floors: `minWager` (≥ `MIN_WAGER_FLOOR` 0.1 USDT, set at deploy — 0.3 USDT in scripts), `claimTimeout` (≥ 1h), `emergencyDelay` (≥ 30d), `maxMessageCodepoints` (≥ 32), `maxMessageBytes` (≥ 128). The five are packed into one storage slot (`uint96`/`uint64`/`uint64`/`uint16`/`uint16`). Frontend reads the live values via `useContractConfig` (see below); `MIN_WAGER`/`CLAIM_TIMEOUT`/`MAX_DUEL_MESSAGE_CHARACTERS`/`MAX_DUEL_MESSAGE_BYTES` in `constants.ts` are only pre-fetch fallbacks — keep them equal to deploy-time defaults.

## Key Files

| File | Purpose |
|------|---------|
| `contracts/src/DuelMe.sol` | Core duel contract |
| `contracts/script/ForwarderConfig.sol` | Forwarder EIP-712 domain name shared by both deploy scripts |
| `contracts/script/TokenFeeProbe.sol` | Deploy-time check that the wager token delivers transfers in full |
| `contracts/test/helpers/DuelMeFixture.sol` | Shared `setUp` for the duel suites (token + forwarder + contract + funded alice/bob) |
| `contracts/test/helpers/DuelMeTestConstants.sol` | The one home for `WAGER`, `MIN_WAGER`, `DEFAULT_INVITE_SECRET`, `STARTING_BALANCE` |
| `frontend/src/lib/wagmi.ts` | wagmi config (Privy adapter); `resolveRpcUrl` validates the RPC env and picks the fallback chain (configured provider → Tenderly) |
| `frontend/src/lib/contracts.ts` | ABI, DuelState enum, ACTIVE_STATES, ERC20 ABIs, getUsdtAddress |
| `frontend/src/lib/constants.ts` | Chain configs, contract addresses, ZERO_ADDRESS, CHAIN_NAMES |
| `frontend/src/components/providers/Providers.tsx` | Privy + wagmi + QueryClient providers |
| `frontend/src/hooks/useDuel.ts` | Read single duel |
| `frontend/src/hooks/useDuelReads.ts` | Paged `getDuels` / `getDuelsByIds` readers shared by every listing screen |
| `frontend/src/lib/duel.ts` | `DuelRecord` / `PlayerDuel` shapes, `toPlayerDuel`, claimable-amount and outcome helpers |
| `frontend/src/components/duel/PartialDataNotice.tsx` | The one banner saying a duel list is short because a page failed to load |
| `frontend/src/hooks/useContractConfig.ts` | Reads owner-adjustable on-chain params (minWager, claimTimeout, maxMessageCodepoints, maxMessageBytes), syncs contractConfig store |
| `frontend/src/lib/contractConfig.ts` | Module-level cache of on-chain params for non-hook helpers (fallbacks from constants.ts) |
| `frontend/src/hooks/useDuelActions.ts` | Write actions (join, cancel, claim, refundAndClaim, etc.) |
| `frontend/src/hooks/useWriteWithGas.ts` | Duel write dispatcher: relayed / resilient / plain routing + merged hash/isPending/error surface |
| `frontend/src/hooks/useDashboardClaims.ts` | Dashboard claim/refund handlers and computed state |
| `frontend/src/hooks/usePlayerDuels.ts` | Filters `useDuelRange` down to one player; wins/losses/volume/withdrawn totals |
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
| `frontend/src/lib/errorDetails.ts` | Flattens an error graph into lowercase detail strings for failure classification; `bestErrorDetail` picks the one worth showing |
| `frontend/src/app/api/relay/route.ts` | Gas relayer: verifies a signed ERC-2771 request and sends `ERC2771Forwarder.execute` |
| `frontend/src/lib/relayRequest.ts` | Relay wire types, relayable-function allowlist, payload validation, outer gas-limit rule |
| `frontend/src/lib/relayerConfig.ts` | Server-only relayer wiring (key, RPC, budget, viem clients) |
| `frontend/src/lib/relayerBudget.ts` | In-memory per-address daily gas budget (reserve / settle / release) |
| `frontend/src/lib/relayerQueue.ts` | Serializes relayed sends so one transaction is in flight at a time |
| `frontend/src/lib/forwardRequest.ts` | Signs the EIP-712 ForwardRequest (domain name, gas padding) |
| `frontend/src/lib/permitSignature.ts` | Signs an EIP-2612 permit, rebuilding and verifying the token's EIP-712 domain |
| `frontend/src/lib/relayApi.ts` | `/api/relay` client + `RelayRequestError` carrying the server's code |
| `frontend/src/hooks/useRelayerStatus.ts` | Whether duel writes on a chain can be relayed (forwarder address + server probe) |
| `frontend/src/lib/testnetGas.ts` | Testnet vs mainnet gas/fee buffers; min-gas constants per duel action |
| `frontend/src/i18n/translations.ts` | Merges the per-area section files into one EN/RU key map — **add keys in `frontend/src/i18n/translations/<section>.ts`**, not here |
| `scripts/sync_readme_contract_addresses.py` | Sync README contract block from `run-latest.json` |
| `frontend/src/lib/__tests__/deployedAddresses.test.ts` | Fails the build when `constants.ts` or a backend `application.yml` address (faucet token, `duelme.contracts.duel-me`) drifts from the broadcast artifact |
| `frontend/src/lib/__tests__/contractAddresses.test.ts` | Fails the build when an in-app address map stops agreeing with `constants.ts` |
| `backend/src/.../controller/ProfileController.java` | Profile CRUD endpoints |
| `backend/src/.../security/PrivyJwksService.java` | Privy JWT verification via JWKS |
| `backend/src/.../security/PrivyJwtAuthenticationFilter.java` | Bearer token → wallet auth filter |
| `backend/src/.../exception/GlobalExceptionHandler.java` | Centralized error handling (404, 403, 400) |
| `backend/src/.../model/Profile.java` | MongoDB profile document (record) |
| `frontend/src/lib/profile.ts` | Profile types and validation constants |
| `frontend/src/lib/profileApi.ts` | Backend profile API client |
| `frontend/src/lib/gameApi.ts` | Backend game-catalog and duel-metadata API client; every duel-metadata call carries the contract address |
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
| `backend/src/.../model/DuelMeta.java` | Duel → game metadata document. Keyed `{contractAddress, duelId, chainId}` — see the duel-id bullet under Common Pitfalls |
| `backend/src/.../service/DuelMetaService.java` | Owns the creator check and normalises both addresses; every lookup is scoped to one deployment |
| `backend/src/.../config/MongoConfig.java` | **Creates every index explicitly.** Spring Boot does not auto-create `@Indexed` / `@CompoundIndex` — see Common Pitfalls |
| `backend/src/.../config/DuelMetaBackfillRunner.java` | Stamps pre-`contractAddress` rows with their chain's live deployment, then drops the old `duelId_chainId` index. Runs before `MongoConfig` creates the new one |
| `backend/src/.../config/ContractProperties.java` | `duelme.contracts.duel-me` — the live DuelMe per chain, the backend's mirror of `constants.ts` |
| `backend/src/.../validation/EvmAddress.java` | The one address regex, shared by the `@Pattern` annotations and the runtime checks |
| `backend/Dockerfile` | Backend container (multi-stage, GraalVM native) |
| `frontend/Dockerfile` | Frontend container (multi-stage, Node 22) |
| `.github/workflows/ci.yml` | CI pipeline: test + deploy (dev & prod) |
| `.github/pull_request_template.md` | PR description skeleton; its Quality gates table is required (see Git Conventions) |
| `ops/docker-compose.{dev,prod}.yml` | Compose stacks |
| `ops/caddy/{dev.duelme.pro,duelme.pro}.Caddyfile` | Caddy reverse proxy |

## Duel States

```
Nonexistent(0)  — an id nobody issued; never a duel
Created(1) → Funded(2) → WinnerClaimed(3) → Resolved(4)      (confirmResult)
                                          → Refunded(5)      (refund, after the claim timeout)
                                          → Disputed(8)
Funded(2) → Resolved(4)                                      (admitDefeat, no confirmation)
Funded(2) → MutualCancelRequested(9) → Funded(2)
                                     → MutuallyCancelled(10)
Created(1) → Cancelled(6)
           → Declined(7)
```

The numbers are part of the contract's API — clients read `state` as a raw integer — and are
pinned on both sides (`testDuelStateNumbering`, `contractMirrors.test.ts`). `Nonexistent` holds
zero so a zeroed mapping slot cannot pass for a duel; see "Smart Contract" above for what that
cost the first time.

## Development Standards

### General Principles

- **File size:** ≤300 lines. Extract helpers/sub-components/composable hooks when approaching the limit. One file = one purpose (SRP). Three files are over it today — `frontend/src/lib/contracts.ts` (the ABI mirror, which must stay a literal copy of the artifact), `frontend/src/app/duel/[id]/page.tsx` and `frontend/src/components/layout/Header.tsx`. The last two are debt, not precedent: don't add to them.
- **DRY:** single source of truth for every constant/type/helper/ABI. See `constants.ts` / `contracts.ts`.
- **YAGNI:** build what the task requires. No abstractions for hypothetical futures. Three similar lines beats a premature abstraction.
- **Fail fast:** validate at system boundaries (user input, API, contract calls). Inside, trust the types. Never silently swallow errors.
- **Self-review before "done":** `npx tsc --noEmit` · `npm run lint` · relevant tests (`forge test`, `./gradlew test`, `npm run test`) · read the diff for debug code / missing error handling / inconsistent naming. A change that goes into a PR then also gets the review loop under Git Conventions before the PR is marked ready for review.

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
- Functional + hooks only. `function` keyword (not arrow). Named exports only — the exception is the App Router files Next requires a default export from (`page.tsx`, `layout.tsx`, `sitemap.ts`, `robots.ts`, `opengraph-image.tsx`, `twitter-image.tsx`), and those are the only default exports in `frontend/src`.
- TypeScript strict — no `any`, no unchecked `as`. Narrow unknown data with a hand-written type guard; there is no schema library in the frontend and adding one is a dependency decision, not a detail.
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

**i18n:** All visible strings via `useTranslation()`. Add the key to the matching section file under `frontend/src/i18n/translations/` — with **both** `en` and `ru`; `defineSection` makes a missing `ru` a type error. `translations.ts` only merges the sections. Interpolation is `{token}` placeholders filled from the second argument (`t('dashboard.pageSummary', { current, total })`); there is no ICU and no plural support, so write a key per form rather than an ICU `plural` block, which would render literally.

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
- Every player-facing state-mutating function: `nonReentrant`. `onlyOwner` entry points are the
  exception, and new `onlyOwner` paths check `msg.sender`, not `_msgSender()`. `whenNotPaused` only
  where a pause should bite — never on a path that hands a player money back. All three rules and
  the reasoning behind them: "Smart Contract" under Architecture Decisions above.
- `SafeERC20` for all token ops — never raw `.transfer()` / `.transferFrom()`.
- CEI pattern: checks → effects → interactions.
- `onlyOwner` for admin; verify authorization before state changes.
- Never trust `msg.value` arithmetic — use explicit amount params.
- Pull-over-push for payouts.

**Gas:**
- Don't initialize storage to defaults (0, `address(0)`, false). `_createDuel` writing `state = Created` is not a violation — `Created` is not the default; `Nonexistent` is, deliberately.
- `calldata` (not `memory`) for read-only params.
- Pack struct storage variables by size.
- `uint256` for loop counters.
- Events for non-on-chain data.
- `immutable` for constructor-set, `constant` for compile-time literals (eliminates SLOAD).
- Cache repeated storage reads in locals (each SLOAD = 100 gas).
- Short-circuit `require`: cheapest check first.

**Testing:** unit test every public/external function (happy + all revert conditions). Access control, state transitions, boundaries (0 / threshold / max), full lifecycle integration. Fuzz arithmetic-heavy fns. Target ≥90% line coverage including emergency/admin.

**Docs:** NatSpec `@notice` on all public functions. `@param` / `@return` for non-obvious. Emit events for every state change.

**ABI sync:** after contract changes, `forge build`, then copy the artifact's `abi` array into `duelMeAbi` in `frontend/src/lib/contracts.ts` **entry for entry, constructor included** — `contractMirrors.test.ts` compares the two canonicalised and fails on anything dropped. Type-checking proves nothing here; run `npm test` from `frontend/`. Update `DuelState` and the `Duel` interface if the enum or `DuelView` changed.

### Testing

- **New feature:** tests alongside or immediately after.
- **Bug fix:** failing reproduction test first, then fix.
- **Refactor:** verify existing tests pass before+after, add coverage for uncovered paths.
- Every public surface (contract fn, REST endpoint, exported hook) must have tests.
- **AAA pattern:** Arrange → Act → Assert. One behavior per test. Name `test{Action}{ExpectedResult}`.

**Contracts (Foundry):** one file per area, `vm.expectRevert` / `vm.expectEmit` / `vm.warp` /
`vm.prank`. `test/helpers/` holds the shared scaffolding — never re-create it inside a suite:
- `DuelMeTestConstants` — `WAGER`, `MIN_WAGER`, `STARTING_BALANCE`, `DEFAULT_INVITE_SECRET`. A new
  shared constant goes here, and nowhere else.
- `DuelMeFixture` — the starting position for every suite that duels: `PlainUsdt` + a forwarder
  named from `ForwarderConfig.NAME` + `DuelMe`, alice and bob funded and approved,
  `DEFAULT_INVITE_HASH` read back off the contract, plus `_createAndFundDuel`,
  `_createFundAndClaim` and `_assertPayouts`. Call `_deployFixture()` from `setUp`. Extra players
  get `_fund(player)`; a suite needing a different token overrides `_deployToken()`, as
  `DuelMeTokenSafety` does for fee-on-transfer.
- `MetaTxSigner` — EIP-712 signing for the ERC-2771 and EIP-2612 suites, which build on it
  instead of `DuelMeFixture` because they need signer keys rather than plain addresses. It
  re-exports the same constants and `ForwarderConfig.NAME`.
- `PlainUsdt` — the wager token for suites that only need a balance. `src/MockUSDT.sol` is the
  testnet deployment and carries mainnet USD₮0's permit quirks; use it only when testing permits.

Re-declaring `WAGER`, `MIN_WAGER`, `DEFAULT_INVITE_SECRET` or a forwarder name in a suite means
that suite is testing a different world than its neighbours — which is the drift the helpers were
extracted to stop. The per-suite test counts in `contracts/README.md` are what to check a refactor
against.

**Frontend (Vitest):** test `lib/` pure logic. Test complex hooks via `renderHook`. Test observable behavior, not implementation. Mock at boundaries.

**Backend (JUnit 5 + Spring Boot Test):** `@SpringBootTest` + `@AutoConfigureMockMvc` + embedded MongoDB. Controller via `MockMvc` (status / shape / auth). Service for logic / auth / edges. `WalletAuthenticationToken` for auth simulation. `@BeforeEach` cleanup for isolation.

**Edge cases always:** zero/max inputs, unauthorized callers, double-execution, empty / boundary-length strings, reentrancy.

**Coverage:** Contracts ≥90%. Backend: all endpoints + service methods (focus auth/validation). Frontend: all `lib/` pure functions.

### Documentation

- **CLAUDE.md:** keep synced with code in the same commit. Key Files table: add new important files, remove deleted or moved ones. Add non-obvious gotchas to Common Pitfalls. State each rule once — when a rule already lives in a section, point at it rather than restating it, because the copy is what goes stale.
- **Code comments:** explain "why", never "what". Use for non-obvious business rules, external-bug workarounds, performance-critical decisions. TODO comments banned in committed code — file an issue.
- **Commit messages:** see Git Conventions above.

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
- `NEXT_PUBLIC_ARBITRUM_RPC_URL` — authenticated RPC for Arbitrum One. **Unset since 2026-09-20**, so both environments run on Tenderly Gateway public; the previous provider was disabled upstream and took withdrawals down with it (see the RPC gotcha below). Used as Privy embedded-wallet override + first wagmi fallback. If you set it: check the endpoint answers `eth_chainId`, add its host to `connect-src`, and lock the URL via the provider's "Allowed Origins" — `NEXT_PUBLIC_*` are inlined into the JS bundle.
- `NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL` — same for Arbitrum Sepolia. Optional; Tenderly public works for dev.
- `FAUCET_ENABLED` / `FAUCET_PRIVATE_KEY` — dev-only testnet dispenser (ETH + MockUSDT). The token it hands out is **not** an env var: `duelme.faucet.mock-usdt-address` in `application.yml` is a literal, deliberately with no `${…}` escape hatch, and pinned to the broadcast artifact by `deployedAddresses.test.ts`. A redeploy edits it in the same commit as `constants.ts`. **Keep it quoted** — YAML reads a bare `0x…` as a hex integer, Spring binds the decimal form, and `FaucetService` rejects it at startup, taking the whole backend down rather than just the faucet. Prod pins `FAUCET_ENABLED: "false"` in `ops/docker-compose.prod.yml` regardless of `.env`.
- `RELAYER_PRIVATE_KEY` — hot wallet that pays gas for relayed duel actions (frontend container, **runtime** not build-time). Unset ⇒ `/api/relay` returns 503 and duel writes stay self-paid. Dedicated key; fund it with only what the daily budgets can spend.
- `RELAYER_RPC_URL` — server-side RPC for the relayer. Optional; defaults to the default chain's public RPC. A browser-origin-locked `NEXT_PUBLIC_*` key will NOT work here — server requests send no `Origin`.
- `RELAYER_DAILY_BUDGET_WEI` — per-address daily gas allowance in wei. Optional; defaults to 0.0005 ETH.
- `RELAYER_GLOBAL_DAILY_BUDGET_WEI` — relayer-wide daily ceiling in wei. Optional; defaults to 0.01 ETH. Addresses are free to create, so this — not the per-address budget — is what bounds a sybil drain.
- `APP_BASE_URL` — backend's view of frontend origin for OAuth redirects (`https://dev.duelme.pro` / `https://duelme.pro`)
- `STEAM_API_KEY` — optional; enables username/avatar enrichment via `GetPlayerSummaries`
- `STEAM_RETURN_URL` — absolute Steam callback URL (`https://{env}/api/v1/profiles/me/social/steam/callback`)
- `TELEGRAM_CLIENT_ID` / `TELEGRAM_CLIENT_SECRET` — OIDC creds from @BotFather → Bot Settings → Web Login
- `TELEGRAM_RETURN_URL` — absolute Telegram callback URL; must match @BotFather-registered URL
- `TELEGRAM_ISSUER` — defaults to `https://oauth.telegram.org`
- Chains: Arbitrum One (42161) prod, Arbitrum Sepolia (421614) dev. Build-time `NEXT_PUBLIC_DEFAULT_CHAIN_KEY` (`arbitrum` / `arbitrumSepolia`) selects.
- Contract addresses: `DUELME_ADDRESSES` map in `constants.ts`, mirrored for the backend by
  `duelme.contracts.duel-me` in `application.yml` (not an env var, same reasoning as the faucet
  token above). A redeploy edits both in the commit that edits the broadcast artifact.

## Common Pitfalls

- `createConfig` from `wagmi` instead of `@privy-io/wagmi` silently breaks wallet routing.
- `useSetActiveWallet` in `useEffect` is too late — use `setActiveWalletForWagmi` sync callback.
- Invite-only duels rely on the full private link (URL fragment) — never fall back to plain `/duel/{id}`.
- USDT has a blocklist — keep payouts pull-based, no push transfers.
- Wilson Score gives low scores for small samples — players with 0 abandoned duels are never "unreliable".
- Only `contracts/broadcast/{Deploy,DeployMainnet}.s.sol/<chainId>/run-latest.json` is tracked; timestamped `run-*.json` ignored via top-level `.gitignore`.
- **Do NOT use `arbitrum-one-rpc.publicnode.com`** — exposes legacy `eth_fillTransaction`, which viem 2.47+ calls during `prepareTransactionRequest` and gets `gasPrice: "0x0"`, producing signed txs with all-zero gas/fees. Privy surfaces as "HTTP request failed". See [viem#4323](https://github.com/wevm/viem/issues/4323) (open as of May 2026). Use Tenderly/drpc/arb1.arbitrum.io, or an authenticated provider you have verified.
- **Privy embedded wallets** sign with all-zero gas/nonce when SDK auto-populates — bypass by passing `gas` / `maxFeePerGas` / `maxPriorityFeePerGas` / `nonce` explicitly in every `writeContract` call. Centralized in `useWriteWithGas` (used by `useDuelActions`; uses `buildTransactionParams` + `resilientBroadcast`) — never call `writeContract` directly from action functions.
- **`ox` peer clash:** `@privy-io/react-auth` declares an *optional* peer `permissionless@^0.2.x`, which in turn declares an optional peer `ox@^0.8.0` that conflicts with viem 2.47's `ox@0.14.5`. Resolved by pinning `ox` in `frontend/package.json` `overrides`. Don't remove it — `npm ci` will ERESOLVE, even though DuelMe itself no longer depends on `permissionless`.
- **Dependabot never edits `overrides` on a version update**, so it would move `viem` and both `@privy-io/*` packages (each pins viem or ox exactly) while `ox` stays on the override above. `.github/dependabot.yml` ignores their minor/patch updates for that reason — bump the four by hand, in one commit.
- **A dead RPC provider looks like nothing at all.** `resolveRpcUrl` validates the URL's shape, never calls it, and Privy embedded wallets broadcast through one URL with no fallback — so an endpoint that has been disabled upstream surfaces only as "HTTP request failed" in the wallet modal, with the fee estimate rendering fine because that goes through Privy's own RPC. On 2026-09-20 the configured Arbitrum One provider answered `403 App is inactive` and withdrawals were dead; the wallet had ample ETH, and gas was the first thing everyone suspected. Before blaming the chain, `curl` the endpoint with `eth_chainId`.
- **CSP `connect-src` must allowlist every external host the frontend calls** — otherwise the browser silently blocks the `fetch` ("Refused to connect ... Content Security Policy"). Set in the `Content-Security-Policy` header in `ops/caddy/{dev.duelme.pro,duelme.pro}.Caddyfile`. Must include the RPC fallback chain from `wagmi.ts` (`https://gateway.tenderly.co`, `https://*.drpc.org`, `arb1.arbitrum.io`, `sepolia-rollup.arbitrum.io`) — plus any custom `NEXT_PUBLIC_*_RPC_URL` host. The Privy wallet-login UI (`loginMethods` includes `'wallet'`) also needs the WalletConnect/Privy set per [Privy's CSP guide](https://docs.privy.io/security/implementation-guide/content-security-policy): `connect-src` += `https://explorer-api.walletconnect.com wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org https://*.rpc.privy.systems`; `frame-src` += `https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com`; `script-src` += `https://challenges.cloudflare.com` (Privy Turnstile). The **live** `/etc/caddy/Caddyfile` is a hand-maintained combined file (other sites too) and is **NOT** auto-deployed by CI — edit it on the host and `sudo systemctl reload caddy` (the repo `ops/caddy/*` files are the reference copy).
- **Relayer gas limit must clear `request.gas * 64 / 63` plus forwarder overhead.** `ERC2771Forwarder._checkForwardedGas` triggers `invalid()` — burning the *entire* limit, not just the unused part — when the forwarded call did not get the gas the request promised. On Arbitrum the L1 posting fee is charged out of the same limit and only `eth_estimateGas` knows its size, so `relayGasLimit` adds the floor ON TOP of the estimate; `max(floor, estimate)` would starve the inner call. Measured forwarder overhead beyond the floor is ~25k.
- **`ERC2771Forwarder.execute` does not bubble up the inner revert reason** — a failed forwarded call surfaces as a bare `Errors.FailedCall()`. `/api/relay` re-simulates the inner call directly as the signer to recover the real message.
- **`collectErrorDetails` returns viem's multi-line dump first.** An error's own `message` is visited before its `shortMessage` / `reason`, so the first entry is the whole "Contract Call / Request Arguments / Version" blob. Use `bestErrorDetail` (shortest non-placeholder detail) whenever the string reaches a person.
- **`fundsViaPermit` has to gate every allowance check, not just the last one.** `handleContinueFlow`, `handleSwitchNetwork` and `handleCreateTransaction` / `handleJoinTransaction` all decide the approve step; a relayed flow that reads the allowance in any of them routes a zero-ETH player into a self-paid `approve`. They share `resolveNeedsApproval` from `guidedFlowSteps.ts`.
- **`FORWARDER_NAME` must match on both sides.** `frontend/src/lib/forwardRequest.ts` and `contracts/script/ForwarderConfig.sol` (which both deploy scripts read) both spell `"DuelMe Forwarder"`; it is the EIP-712 domain name, so a mismatch makes every signature fail `verify` with no other symptom.
- **`ForwardRequestData` has no `nonce` field in OpenZeppelin 5.x** — the forwarder reads it from `Nonces` at execution time and folds it into the signed struct hash via the typehash. It must be signed but never sent. `deadline` is a `uint48`, not `uint256` (the EIP-2612 permit deadline is `uint256` — do not mix them up).
- **Mainnet USDT (USD₮0, Arbitrum One) has no ERC-5267 `eip712Domain()`** and its `name()` is `USD₮0` with U+20AE, not an ASCII "T". Build the permit domain from `name()` + version `"1"` and verify it against the token's own `DOMAIN_SEPARATOR()`. `MockUSDT` deliberately mirrors both traits so a mistake fails on dev. Covered by `contracts/test/UsdtPermitFork.t.sol` (skipped without `ARBITRUM_RPC_URL`).
- **USD₮0 validates permit through ERC-1271 whenever the owner address has code**, which an EIP-7702 delegation gives a plain EOA. Such a player's permit can fail (`"Permit failed"`). The contract still accepts the plain `createDuel` / `joinDuel` once an allowance exists, but the UI does not currently offer that route while relaying is on — the approve step is pinned off — and `approve` cannot be relayed anyway, since the token does not trust our forwarder. So this player is blocked in the guided flow; reaching them needs a product decision, not just ETH.
- **The relayer's budget ledger is in-memory**, so it resets on redeploy and is not shared across replicas. Accurate for the current single-container-per-env deployment; more than one replica needs a shared store.
- README contract addresses auto-generated from `run-latest.json` by `scripts/sync_readme_contract_addresses.py` / pre-commit hook — don't edit that block manually.
- Manual deploys here: source `contracts/.env` first (`set -a && . ./.env && set +a`).
- **Contract addresses and chain ids have exactly one source.** `contracts/broadcast/*/run-latest.json` is what is deployed; `constants.ts` mirrors it by hand; everything else reads `constants.ts`. Never inline an address or a chain id anywhere else — `getUsdtAddress` once kept its own copy "to avoid a circular import" (`constants.ts` imports nothing, so there was no cycle), and after a MockUSDT redeploy the permit path read `nonces()` off the previous token, so duels failed with a revert that named no address. `deployedAddresses.test.ts` pins `constants.ts` and both of `application.yml`'s address copies (the faucet token and `duelme.contracts.duel-me`) to the broadcast artifact; `contractAddresses.test.ts` pins `getUsdtAddress`, `CHAIN_NAMES` and the forwarder map to `constants.ts`. Both run in the `frontend` CI job (`npm test`).
- Use shared constants from `constants.ts` (`ZERO_ADDRESS`, `CHAIN_NAMES`) and `contracts.ts` (`ACTIVE_STATES`, `balanceOfAbi`, `transferAbi`, `getUsdtAddress`) — never redefine locally.
- **Do not enable `via_ir`, and leave `optimizer_runs` at 200.** Measured on this contract:
  `runs = 1000` changes runtime gas by under 0.1% while growing the deployed bytecode from 21.4 KB
  to 23.8 KB — 97% of the 24 KB limit. `via_ir` does shrink it (19.2 KB) and shaves ~7% off
  `getDuel`, but the IR pipeline caches `block.timestamp` across cheatcode calls inside a test
  function, so a second `vm.warp(block.timestamp + …)` silently warps from the stale value and
  time-based tests pass or fail for the wrong reason. Probe before reconsidering:
  two warps in one test must add up.
- **`abi.encodeCall` cannot name an overloaded function.** Only `createDuel` still has arity
  variants (with and without a message); everything added since got its own name (`createDuelFor`,
  `claimPayoutTo`, …) precisely so Solidity callers keep `abi.encodeCall`. Where an overload is
  unavoidable, use `abi.encodeWithSignature("createDuel(uint256,bytes32)", …)`. viem resolves
  overloads from the argument list, so the frontend is unaffected either way.
- **`duelMeAbi` and `DuelState` in `contracts.ts` are hand-made mirrors of the contract**, and a
  wrong entry does not fail to compile — it encodes a selector that does not exist, or reads
  `Resolved` as `Refunded`. `frontend/src/lib/__tests__/contractMirrors.test.ts` pins both: the ABI
  against `contracts/out/DuelMe.sol/DuelMe.json` entry for entry, and the enum numbering against
  the same table as `testDuelStateNumbering` in `DuelMe.t.sol`. `contracts/out/` is build output
  and is not committed, so the ABI half **skips** when it is missing — run `forge build` before
  trusting a green local frontend suite. CI cannot skip it: the `frontend` job builds the contracts
  first, and a second assertion fails whenever `CI` is set and the artifact is absent.
- **The invite hash formula is the contract's**: `DuelMe.hashInviteSecret` is public, so the tests
  read it off the contract instead of mirroring it. `frontend/src/lib/invite.ts` still reproduces it
  (`keccak256(abi.encode(address(this), chainid, secret))`) because it has to hash before the duel
  exists; both sides are pinned to one golden vector — `testInviteHashGoldenVector` in
  `DuelMeInvites.t.sol` and "matches the vector the contract produces" in `invite.test.ts`. A
  divergence fails as `"Invalid invite"` on a duel nobody can join.
- **Every new entry point whose required state is `Created` goes through `_requireWaitingDuel`,
  and `Created` never gets the enum's zero value.** Why, and what it cost the first time: see the
  `DuelState.Nonexistent` bullet under "Smart Contract".
- **Add an action to `DuelMeHandler` and you must also add it to `testHandlerDrivesAFullLifecycle`.**
  The invariant suite (`contracts/test/DuelMeInvariant.t.sol`) asserts the contract never owes more
  USDT than it holds, but every handler action swallows its own revert — so without that lifecycle
  test the whole run can go green over duels that never got past `Created`. Payouts stay derived
  (see "Smart Contract"); a stored payout field would give the invariant something new to catch.
- **A Spring Data index annotation does nothing unless `MongoConfig` creates it.** Spring Boot 3+
  stopped auto-creating indexes declared with `@Indexed` / `@CompoundIndex`, and
  `spring.data.mongodb.auto-index-creation` is deliberately unset — so `unique = true` on a
  document is documentation, not a constraint. Nothing fails loudly: the `DuplicateKeyException`
  branch that was meant to catch the collision simply becomes unreachable, two concurrent writes
  leave two rows, and the *next* read of that key dies with
  `IncorrectResultSizeDataAccessException` — a permanent 500 on one entity, long after the write.
  Every index gets an explicit `ApplicationRunner` in
  `backend/src/.../config/MongoConfig.java`; `createIndex` is idempotent, so it runs on every boot.
  Name the index the same in both places — a second spelling of one key is not a second index,
  it is an `IndexOptionsConflict` thrown out of a runner, which takes the boot down with it.
  `MongoIndexTest` proves this for `duelMeta`, `games` and `faucet_claims` by inserting an actual
  duplicate; the `Profile` constraints are created by the same mechanism and are **not** yet
  covered, so do not read a green suite as "every unique index is enforced".
- **A duel id identifies a duel only together with the contract it came from.** Ids are handed out
  by `duelCount`, which restarts at zero on every redeploy, so after a same-chain redeploy duel 3
  is a different duel than yesterday's duel 3. Anything keyed on `{duelId, chainId}` silently
  matches the wrong duel — it has already bitten stored invite secrets (`lib/invite.ts`) and duel
  metadata (`DuelMeta`), and in both cases the symptom was a wrong answer, never an error. Key on
  the contract address too, and take it from `DUELME_ADDRESSES[chainId]`.
- **The same rule covers the MockUSDT a redeploy replaces.** `FaucetClaim` was keyed by wallet
  alone, so after a redeploy every past claimant got `FaucetAlreadyClaimedException` against a
  token they had drawn nothing from — the dev faucet went dead for the people already testing,
  and silently, since the wallet got the ordinary "already claimed" answer. `tokenAddress` is now
  part of that key. Anything keyed on a wallet plus a contract-issued thing needs the contract in
  the key.
- `PRIVY_APP_ID` env required for backend (no default in `application.yml`).
- Frontend npm pinned to `^11.12.1` via `frontend/package.json` `engines` + `frontend/.npmrc` `engine-strict=true`. CI and `frontend/Dockerfile` both pin it with `corepack enable npm && corepack prepare npm@11.12.1 --activate` — `corepack enable` alone does **not** shim npm (npm ships with Node), so npm has to be named explicitly or the `packageManager` field is ignored. A mismatch caused `EUSAGE` / `EBADENGINE` in `npm ci`.
- `overrides.eslint-plugin-react-hooks: 7.0.1` is a temporary pin — `7.1.x` adds `react-hooks/set-state-in-effect`, which flags existing patterns in `dashboard/page.tsx`, `duel/[id]/page.tsx`, `Header.tsx`, `useCreateDuelFlow.ts`, `useJoinDuelFlow.ts`. Lift only after refactoring those files.

Source of truth for current deploys: `contracts/broadcast/Deploy.s.sol/421614/run-latest.json` (Arbitrum Sepolia / dev) and `contracts/broadcast/DeployMainnet.s.sol/42161/run-latest.json` (Arbitrum One / prod), mirrored into `README.md` and `frontend/src/lib/constants.ts`.
