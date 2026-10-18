# Frontend (`frontend/`)

Rules for the Next.js app, which also hosts the gas relayer. The root `CLAUDE.md` applies here
too. Next.js 16 differs from older releases; its
version-matched docs are in `node_modules/next/dist/docs/`. `next dev` would point at them from an
untracked `AGENTS.md` here; `agentRules: false` in `next.config.ts` turns that off, since the area's
rules live in this file.

## Architecture

### Wallet Integration
- `createConfig` must be imported from `@privy-io/wagmi`, NOT `wagmi`
- `setActiveWalletForWagmi` prop on `<WagmiProvider>` ensures Privy embedded wallet beats MetaMask
- Chain switching via wagmi's `useSwitchChain` (not Privy's `switchChain`)

### Transaction Pattern
Write ops, relayed: check chain → sign EIP-2612 permit (funding calls only) → sign
ForwardRequest → POST `/api/relay`. Self-paid: check chain → check allowance → approve if
needed → execute. `useDuelActions` binds each duel action on top of `useWriteWithGas`, picks
between the two paths as each write is sent, from the `useRelayerStatus` probe, and swaps in the
`*WithPermit` variant when the write is relayed (see "Gasless Duel Actions" below). `createDuel` generates a private invite secret
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

### Gasless Duel Actions (ERC-2771)
`DuelMe` trusts one immutable `ERC2771Forwarder`, set at deploy. The client signs an EIP-712
`ForwardRequest`. `/api/relay` caps POSTs per client IP, refuses anything outside
`RELAYABLE_DUEL_FUNCTIONS`, answers a repeat of a request it already sent with that
transaction's hash, holds back a signer whose last relayed transaction has no receipt yet,
and runs `forwarder.verify` and a simulation of `execute` *before* the request may queue for
the relayer lock, so a request that would revert never holds a place in the queue. Under the
lock it repeats the hold, `verify` and the simulation (a transaction sent meanwhile can
change them), meters a per-address daily gas budget under a relayer-wide daily ceiling, and
signs and sends `forwarder.execute`, one transaction at a time; receipts are awaited after
the lock, so several sent transactions can be waiting to be mined at once. Funding uses EIP-2612 —
`createDuelWithPermit` / `joinDuelWithPermit` — so no separate `approve` is needed. There is
no automatic fallback: once `useRelayerStatus` reports relaying on, `useDuelActions` routes
every relayable duel write through `/api/relay` and the guided flows pin `needsApproval` to
false, so a refusal (spent daily budget, `"Permit failed"` on a delegated EOA) surfaces as an
error rather than reverting to the self-paid approve path. Relaying being *off* — no forwarder
address, no relayer key — is the case the self-paid path still covers.

## Standards (Next.js / React / TS / Tailwind)

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

**i18n:** All visible strings via `useTranslation()`. Add the key to the matching section file under `frontend/src/i18n/translations/` — with **both** `en` and `ru`; `defineSection` makes a missing `ru` a type error. `translations.ts` only merges the sections. Interpolation is `{token}` placeholders filled from the second argument (`t('dashboard.pageSummary', { current, total })`); there is no ICU, so an ICU `plural` block would render literally. A word that agrees with a number goes through `plural(key, count)` from `useTranslation()` (`i18n/pluralize.ts`): give the base key `.one`, `.few`, `.many` and `.other` in both languages: Russian picks among the first three for whole numbers, and `.other` is the fallback a key needs to count as a `PluralKey` at all. It returns the word alone and the caller places the number: `{game.duelCount} {plural('games.duelsCount', game.duelCount)}`.

**Naming:** Components `PascalCase.tsx`, hooks `camelCase.ts` prefixed `use`, utils `camelCase.ts`, primitive constants `UPPER_SNAKE_CASE`, object constants `camelCase`, types `PascalCase` (prefer `interface` for object shapes).

## Testing

**Frontend (Vitest):** test `lib/` pure logic. Test complex hooks via `renderHook`. Test observable behavior, not implementation. Mock at boundaries. Vitest runs in `node`; a hook or component test opts into a DOM with `// @vitest-environment happy-dom` as its first line and renders through `@testing-library/react` (see `src/hooks/__tests__/`).

## Key Files

| File | Purpose |
|------|---------|
| `frontend/src/lib/wagmi.ts` | wagmi config (Privy adapter); `resolveRpcUrl` validates the RPC env and picks the fallback chain (configured provider → Tenderly) |
| `frontend/src/lib/contracts.ts` | ABI, DuelState enum, ACTIVE_STATES, ERC20 ABIs, getUsdtAddress |
| `frontend/src/lib/constants.ts` | Chain configs, contract addresses, ZERO_ADDRESS, CHAIN_NAMES |
| `frontend/src/components/providers/Providers.tsx` | Privy + wagmi + QueryClient providers |
| `frontend/src/hooks/useDuel.ts` | Read single duel, polled until it is over and paid out; a failed poll keeps the last duel |
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
| `frontend/src/components/wallet/DepositPanel.tsx` | Top-up panel: full address, QR, balance, fee note, faucet — for the `chainId` it is given |
| `frontend/src/lib/deposit.ts` | Balance freshness / sufficiency rule (`resolveBalanceStatus`, `resolveFunding`), top-up copy, wallet-menu per-chain balances |
| `frontend/src/hooks/useFlowFunding.ts` | Balance gate and review ↔ top-up switch on the create and join review steps |
| `frontend/src/lib/createDuelDraft.ts` | Versioned `sessionStorage` draft of the create form, kept across a top-up (no invite secret) |
| `frontend/src/lib/clipboard.ts` | `copyText` — the one clipboard write; confirm "Copied" only when it returns `true` |
| `frontend/src/hooks/useCopyFeedback.ts` | Copy-button state on top of `copyText`: "Copied" only for a write that landed, a toast otherwise |
| `frontend/src/lib/addressQr.ts` | QR of a bare string as an SVG path, rendered as plain React markup |
| `frontend/src/hooks/useFaucetClaim.ts` | Testnet faucet claim shared by the wallet menu and the top-up panel |
| `frontend/src/lib/buildTransactionParams.ts` | Builds explicit `gas`/`maxFeePerGas`/`maxPriorityFeePerGas`/`nonce` to bypass Privy auto-populate (see Common Pitfalls) |
| `frontend/src/lib/resilientBroadcast.ts` | Splits writes into sign + broadcast so wagmi fallback transport handles RPC retries |
| `frontend/src/lib/errorDetails.ts` | Flattens an error graph into lowercase detail strings for failure classification; `bestErrorDetail` picks the one worth showing; `isRevertedReceiptError` tells a reverted receipt from a failure to read one |
| `frontend/src/app/api/relay/route.ts` | Gas relayer: admits a signed ERC-2771 request, then signs and sends `ERC2771Forwarder.execute` under the lock (order: "Gasless Duel Actions") |
| `frontend/src/lib/relayRequest.ts` | Relay wire types and error codes, relayable-function allowlist, payload validation, outer gas-limit rule |
| `frontend/src/lib/relayerConfig.ts` | Server-only relayer wiring (key, RPC, budget, viem clients) |
| `frontend/src/lib/relayerBudget.ts` | In-memory per-address daily gas budget (reserve / settle / release) |
| `frontend/src/lib/relayerQueue.ts` | Serializes relayed sends: one transaction is signed and sent at a time; receipts are awaited after the lock |
| `frontend/src/lib/relaySimulation.ts` | `forwarder.verify` and the `execute` simulation, run before the lock and again under it; recovers the inner revert reason |
| `frontend/src/lib/relayerRateLimit.ts` | In-memory per-IP limit on relay POSTs |
| `frontend/src/lib/relayerDedup.ts` | Collapses repeats of one signed request into a single relay |
| `frontend/src/lib/relayerSignerHold.ts` | Holds a signer back until their last relayed transaction has a receipt |
| `frontend/src/lib/forwardRequest.ts` | Signs the EIP-712 ForwardRequest (domain name, gas padding) |
| `frontend/src/lib/permitSignature.ts` | Signs an EIP-2612 permit, rebuilding and verifying the token's EIP-712 domain |
| `frontend/src/lib/relayApi.ts` | `/api/relay` client + `RelayRequestError` carrying the server's code |
| `frontend/src/hooks/useRelayerStatus.ts` | Whether duel writes on a chain can be relayed (forwarder address + server probe); `relayerStatusQuery` is the probe `useDuelActions` awaits when a write is sent before it answered |
| `frontend/src/lib/testnetGas.ts` | Testnet vs mainnet gas/fee buffers; min-gas constants per duel action |
| `frontend/src/i18n/translations.ts` | Merges the per-area section files into one EN/RU key map — **add keys in `frontend/src/i18n/translations/<section>.ts`**, not here |
| `frontend/src/lib/__tests__/deployedAddresses.test.ts` | Fails the build when `constants.ts` or a backend `application.yml` address (faucet token, `duelme.contracts.duel-me`) drifts from the broadcast artifact |
| `frontend/src/lib/__tests__/contractAddresses.test.ts` | Fails the build when an in-app address map stops agreeing with `constants.ts` |
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
| `frontend/Dockerfile` | Frontend container (multi-stage, Node 22) |

## Environment

- `NEXT_PUBLIC_PRIVY_APP_ID` — Privy app ID (frontend)
- `NEXT_PUBLIC_API_URL` — Backend API base URL (default `/api/v1`)
- `NEXT_PUBLIC_ARBITRUM_RPC_URL` — authenticated RPC for Arbitrum One. **Unset since 2026-09-20**, so both environments run on Tenderly Gateway public; the previous provider was disabled upstream and took withdrawals down with it (see the RPC gotcha below). Used as Privy embedded-wallet override + first wagmi fallback. If you set it: check the endpoint answers `eth_chainId`, add its host to `connect-src`, and lock the URL via the provider's "Allowed Origins" — `NEXT_PUBLIC_*` are inlined into the JS bundle.
- `NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL` — same for Arbitrum Sepolia. Optional; Tenderly public works for dev.
- `RELAYER_PRIVATE_KEY` — hot wallet that pays gas for relayed duel actions (frontend container, **runtime** not build-time). Unset ⇒ `/api/relay` returns 503 and duel writes stay self-paid. Dedicated key; fund it with only what the daily budgets can spend.
- `RELAYER_RPC_URL` — server-side RPC for the relayer. Optional; defaults to the default chain's public RPC. A browser-origin-locked `NEXT_PUBLIC_*` key will NOT work here — server requests send no `Origin`.
- `RELAYER_DAILY_BUDGET_WEI` — per-address daily gas allowance in wei. Optional; defaults to 0.0005 ETH.
- `RELAYER_GLOBAL_DAILY_BUDGET_WEI` — relayer-wide daily ceiling in wei. Optional; defaults to 0.01 ETH. Addresses are free to create, so this — not the per-address budget — is what bounds a sybil drain.

## Common Pitfalls

- `createConfig` from `wagmi` instead of `@privy-io/wagmi` silently breaks wallet routing.
- `useSetActiveWallet` in `useEffect` is too late — use `setActiveWalletForWagmi` sync callback.
- Invite-only duels rely on the full private link (URL fragment) — never fall back to plain `/duel/{id}`.
- **Top-up details belong to the duel's network, not the wallet's.** `DepositPanel` takes `chainId` from its caller (the flow's `draft.chainId`, the network picked in the wallet menu), never from `useChainId()` or the connected wallet — a player connected to another network would otherwise be told to send USDT where the duel cannot use it. Its QR encodes the bare address only: no `ethereum:` URI, amount, token or invite secret.
- Wilson Score gives low scores for small samples — players with 0 abandoned duels are never "unreliable".
- **Do NOT use `arbitrum-one-rpc.publicnode.com`** — exposes legacy `eth_fillTransaction`, which viem 2.47+ calls during `prepareTransactionRequest` and gets `gasPrice: "0x0"`, producing signed txs with all-zero gas/fees. Privy surfaces as "HTTP request failed". See [viem#4323](https://github.com/wevm/viem/issues/4323) (open as of May 2026). Use Tenderly/drpc/arb1.arbitrum.io, or an authenticated provider you have verified.
- **Privy embedded wallets** sign with all-zero gas/nonce when SDK auto-populates — bypass by passing `gas` / `maxFeePerGas` / `maxPriorityFeePerGas` / `nonce` explicitly in every `writeContract` call. Centralized in `useWriteWithGas` (used by `useDuelActions`; uses `buildTransactionParams` + `resilientBroadcast`) — never call `writeContract` directly from action functions.
- **`ox` peer clash:** `@privy-io/react-auth` declares an *optional* peer `permissionless@^0.2.x`, which in turn declares an optional peer `ox@^0.8.0` that conflicts with viem 2.47's `ox@0.14.5`. Resolved by pinning `ox` in `frontend/package.json` `overrides`. Don't remove it — `npm ci` will ERESOLVE, even though DuelMe itself no longer depends on `permissionless`.
- **Dependabot never edits `overrides` on a version update**, so it would move `viem` and both `@privy-io/*` packages (each pins viem or ox exactly) while `ox` stays on the override above. `.github/dependabot.yml` ignores their minor/patch updates for that reason — bump the four by hand, in one commit.
- **A dead RPC provider looks like nothing at all.** `resolveRpcUrl` validates the URL's shape, never calls it, and Privy embedded wallets broadcast through one URL with no fallback — so an endpoint that has been disabled upstream surfaces only as "HTTP request failed" in the wallet modal, with the fee estimate rendering fine because that goes through Privy's own RPC. On 2026-09-20 the configured Arbitrum One provider answered `403 App is inactive` and withdrawals were dead; the wallet had ample ETH, and gas was the first thing everyone suspected. Before blaming the chain, `curl` the endpoint with `eth_chainId`.
- **Relayer gas limit must clear `request.gas * 64 / 63` plus forwarder overhead.** `ERC2771Forwarder._checkForwardedGas` triggers `invalid()` — burning the *entire* limit, not just the unused part — when the forwarded call did not get the gas the request promised. On Arbitrum the L1 posting fee is charged out of the same limit and only `eth_estimateGas` knows its size, so `relayGasLimit` adds the floor ON TOP of the estimate; `max(floor, estimate)` would starve the inner call. Measured forwarder overhead beyond the floor is ~25k.
- **`ERC2771Forwarder.execute` does not bubble up the inner revert reason** — a failed forwarded call surfaces as a bare `Errors.FailedCall()`. `/api/relay` re-simulates the inner call directly as the signer to recover the real message.
- **A reverted transaction surfaces as an error, not as a receipt that never comes.** wagmi's
  `useWaitForTransactionReceipt` throws when the mined receipt says `reverted`. `useWriteWithGas`
  merges that error into its `error`; a surface that reads only `isSuccess` / `isLoading` leaves a
  guided flow on "confirming" with its close button gone. Only a revert does
  (`isRevertedReceiptError`): any other failure to read the receipt is retried for as long as it
  lasts, because a write reported as failed that went through is one "Try again" away from a
  second duel and a second wager.
- **Nothing plans or sends a duel write before the relay probe answers.** While
  `useRelayerStatus` is in flight, `isRelayEnabled` reads false, which would put a player the
  relayer would carry on the self-paid path. So `useDuelActions` takes the route as the write is
  sent, awaiting the probe if it has to (`relayerStatusQuery`), and the create and join flows read
  no allowance and keep Continue closed until `isRelayResolved`, because they plan the approve
  step before sending. `fetchRelayerStatus` throws on anything but the route's answer (a 502, a
  body that is not a status), so the probe is asked again rather than read as "off".
- **`collectErrorDetails` returns viem's multi-line dump first.** An error's own `message` is visited before its `shortMessage` / `reason`, so the first entry is the whole "Contract Call / Request Arguments / Version" blob. Use `bestErrorDetail` (shortest non-placeholder detail) whenever the string reaches a person.
- **`fundsViaPermit` has to gate every allowance check, not just the last one.** `handleContinueFlow`, `handleSwitchNetwork` and `handleCreateTransaction` / `handleJoinTransaction` all decide the approve step; a relayed flow that reads the allowance in any of them routes a zero-ETH player into a self-paid `approve`. They share `resolveNeedsApproval` from `guidedFlowSteps.ts`.
- **`FORWARDER_NAME` must match on both sides.** `frontend/src/lib/forwardRequest.ts` and `contracts/script/ForwarderConfig.sol` (which both deploy scripts read) both spell `"DuelMe Forwarder"`; it is the EIP-712 domain name, so a mismatch makes every signature fail `verify` with no other symptom.
- **`ForwardRequestData` has no `nonce` field in OpenZeppelin 5.x** — the forwarder reads it from `Nonces` at execution time and folds it into the signed struct hash via the typehash. It must be signed but never sent. `deadline` is a `uint48`, not `uint256` (the EIP-2612 permit deadline is `uint256` — do not mix them up).
- **Mainnet USDT (USD₮0, Arbitrum One) has no ERC-5267 `eip712Domain()`** and its `name()` is `USD₮0` with U+20AE, not an ASCII "T". Build the permit domain from `name()` + version `"1"` and verify it against the token's own `DOMAIN_SEPARATOR()`. `MockUSDT` deliberately mirrors both traits so a mistake fails on dev. Covered by `contracts/test/UsdtPermitFork.t.sol` (skipped without `ARBITRUM_RPC_URL`).
- **USD₮0 validates permit through ERC-1271 whenever the owner address has code**, which an EIP-7702 delegation gives a plain EOA. Such a player's permit can fail (`"Permit failed"`). The contract still accepts the plain `createDuel` / `joinDuel` once an allowance exists, but the UI does not currently offer that route while relaying is on — the approve step is pinned off — and `approve` cannot be relayed anyway, since the token does not trust our forwarder. So this player is blocked in the guided flow; reaching them needs a product decision, not just ETH.
- **The relayer's budget ledger, per-IP rate limit, repeat memory and signer holds are in-memory**, so they reset on redeploy and are not shared across replicas. Accurate for the current single-container-per-env deployment; more than one replica needs a shared store.
- **The per-IP rate limit trusts the right-most `X-Forwarded-For` entry** because Caddy, with no `trusted_proxies`, overwrites the header with the address it saw, nothing sits in front of Caddy, and the container listens on `127.0.0.1` only. A CDN or another proxy in front of Caddy makes that entry the proxy's, and every player then shares one bucket: change the rule with it.
- Use shared constants from `constants.ts` (`ZERO_ADDRESS`, `CHAIN_NAMES`) and `contracts.ts` (`ACTIVE_STATES`, `balanceOfAbi`, `transferAbi`, `getUsdtAddress`) — never redefine locally.
- **The CI `next build` has no Privy app id.** The `frontend` job builds without secrets, so `NEXT_PUBLIC_PRIVY_APP_ID` is undefined there, and that works only because the root layout is `force-dynamic` and nothing under it is prerendered. Remove `force-dynamic` and the job fails with `Cannot initialize the Privy provider with an invalid Privy app ID`, while the image build, which gets the real id, passes.
- Frontend npm pinned to `^11.12.1` via `frontend/package.json` `engines` + `frontend/.npmrc` `engine-strict=true`. CI and `frontend/Dockerfile` both pin it with `corepack enable npm && corepack prepare npm@11.12.1 --activate` — `corepack enable` alone does **not** shim npm (npm ships with Node), so npm has to be named explicitly or the `packageManager` field is ignored. A mismatch caused `EUSAGE` / `EBADENGINE` in `npm ci`.
- `overrides.eslint-plugin-react-hooks: 7.0.1` is a temporary pin — `7.1.x` adds `react-hooks/set-state-in-effect`, which flags existing patterns in `dashboard/page.tsx`, `duel/[id]/page.tsx`, `Header.tsx`, `useCreateDuelFlow.ts`, `useJoinDuelFlow.ts`. Lift only after refactoring those files.
- **CSP `connect-src` must allowlist every external host the frontend calls** — otherwise the browser silently blocks the `fetch` ("Refused to connect ... Content Security Policy"). Set in the `Content-Security-Policy` header in `ops/caddy/{dev.duelme.pro,duelme.pro}.Caddyfile`. Must include the RPC fallback chain from `wagmi.ts` (`https://gateway.tenderly.co`, `https://*.drpc.org`, `arb1.arbitrum.io`, `sepolia-rollup.arbitrum.io`) — plus any custom `NEXT_PUBLIC_*_RPC_URL` host. The Privy wallet-login UI (`loginMethods` includes `'wallet'`) also needs the WalletConnect/Privy set per [Privy's CSP guide](https://docs.privy.io/security/implementation-guide/content-security-policy): `connect-src` += `https://explorer-api.walletconnect.com wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org https://*.rpc.privy.systems`; `frame-src` += `https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com`; `script-src` += `https://challenges.cloudflare.com` (Privy Turnstile). The **live** `/etc/caddy/Caddyfile` is a hand-maintained combined file (other sites too) and is **NOT** auto-deployed by CI — edit it on the host and `sudo systemctl reload caddy` (the repo `ops/caddy/*` files are the reference copy).
- Four frontend rules live in `contracts/CLAUDE.md`, beside the contract they mirror: `duelMeAbi` /
  `DuelState` in `lib/contracts.ts` and the invite-hash formula in `lib/invite.ts` ("ABI sync",
  Common Pitfalls); Join/Decline gate on `invitedOpponent`, not `inviteHash` alone (the
  `inviteHash == bytes32(0)` bullet); the `constants.ts` fallbacks equal the deploy-time defaults
  (the owner-settable params bullet).
- Both health endpoints report `environment` and `release`, and the deploy passes only when both
  match: see Deployment in `ops/CLAUDE.md` before changing either.
