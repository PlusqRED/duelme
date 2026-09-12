# DuelMe Copilot Instructions

## Build, lint, and test commands

- Frontend (`frontend/`):
  - `npm install`
  - `npm run dev`
  - `npm run build`
  - `npm run lint`
  - `npx tsc --noEmit`
- Contracts (`contracts/`):
  - `forge install`
  - `forge build`
  - `forge test`
  - `forge test --match-test testCreateDuel`
  - `forge test --match-test testCreateDuel --match-path test/DuelMe.t.sol`
  - `forge coverage --report summary`
- CI is contract-focused. `.github/workflows/test.yml` runs `forge build`, `forge test -v`, and `forge coverage --report summary` on pushes and PRs to `main`.
- There is currently no frontend test script in `frontend/package.json`.

## High-level architecture

- This is a monorepo with a Foundry contract project in `contracts/` and a Next.js App Router frontend in `frontend/`.
- Deployments run through `.github/workflows/ci.yml`: merging to `dev` deploys `dev.duelme.pro`, merging to `main` deploys `duelme.pro`.
- Runtime secrets and environment-specific config are stored in GitHub repository/environment secrets. The deploy workflow writes `~/apps/duelme-{dev,prod}/.env` from those secrets immediately before `docker compose up`; do not commit secrets and do not rely on manually maintained server `.env` files.
- `contracts/src/DuelMe.sol` is the core escrow contract for 1v1 USDT duels. It stores duel state, enforces the lifecycle (`Created -> Funded -> WinnerClaimed -> Resolved/Refunded/Disputed`, plus `Cancelled`, `Declined`, `MutualCancelRequested`, and `MutuallyCancelled`), updates on-chain reputation counters, uses claim-based payouts/refunds, supports owner pause/unpause, and has a timelocked emergency withdrawal path for USDT.
- `frontend/src/lib/contracts.ts` manually mirrors the Solidity ABI and `DuelState` enum used by the frontend. If `DuelMe.sol` changes, keep the ABI, enum ordering, and TypeScript `Duel` shape in sync.
- `frontend/src/components/providers/Providers.tsx` defines the runtime provider stack used by `frontend/src/app/layout.tsx`: `PrivyProvider -> QueryClientProvider -> WagmiProvider -> LanguageProvider -> TooltipProvider/Toaster`.
- Wallet connectivity depends on `frontend/src/lib/wagmi.ts` plus the provider setup above. `WagmiProvider` is from `@privy-io/wagmi` and uses `setActiveWalletForWagmi` so wagmi transactions prefer the embedded Privy wallet.
- Read-side blockchain access is hook-driven:
  - `frontend/src/hooks/useDuel.ts` reads a single duel with `getDuel`.
  - `frontend/src/hooks/usePlayerDuels.ts` reads `duelCount`, multicalls `getDuel` for every duel id, then filters/sorts client-side for one wallet.
  - `frontend/src/hooks/useRecentDuels.ts` reads the recent duel feed for the landing page and keeps it newest-first for search/pagination UI.
  - `frontend/src/hooks/usePlatformStats.ts` reads `duelCount` + duel data to power live landing-page `Total Volume` and `Duels Played` metrics.
  - `frontend/src/hooks/useReputation.ts` reads `getPlayerStats` and computes the Wilson-score-based reputation badge in the frontend.
- Write-side blockchain access is centralized in `frontend/src/hooks/useDuelActions.ts`, but the page-level flows live in UI code:
- `frontend/src/components/duel/CreateDuelForm.tsx` handles create-duel allowance checks, approval, invite-secret generation, optional Unicode duel messages, `createDuel`, and receipt parsing to extract the new duel id.
- `frontend/src/app/duel/[id]/page.tsx` handles invite-secret recovery from the URL fragment/local storage plus join/decline/claim/confirm/dispute/refund/cancel/mutual-cancel/claim-payout flows and refreshes the duel after successful transactions.
- Chain/network configuration lives in `frontend/src/lib/constants.ts`. `SUPPORTED_CHAINS` lists Arbitrum Sepolia, Arbitrum One, and Polygon, but only Arbitrum Sepolia currently has a non-zero `DUELME_ADDRESSES` deployment. The dashboard, duel detail page, and recent duels flow are pinned to Arbitrum Sepolia today.
- Localization is custom, not library-based. `frontend/src/i18n/LanguageContext.tsx` and `frontend/src/i18n/useTranslation.ts` read from the static `frontend/src/i18n/translations.ts` object and persist the selected language in local storage.

## Key conventions

- Import `createConfig` from `@privy-io/wagmi`, not `wagmi`. This is required for Privy wallet routing.
- Use `useSwitchChain` from wagmi for network switching. Do not use Privy's chain switch helper for app transaction flows.
- Keep `setActiveWalletForWagmi` on `WagmiProvider`; do not replace it with a later `useEffect`-based wallet selection flow.
- All wager amounts are USDT with 6 decimals. Raw on-chain values are derived from display values with `parseUnits(amount, USDT_DECIMALS)`; the UI minimum is `MIN_WAGER` in `constants.ts` and must match the deployed contract's `minWager()`.
- Treat `SUPPORTED_CHAINS`, `DUELME_ADDRESSES`, and the per-chain USDT addresses in `constants.ts` as the source of truth for frontend chain behavior. Guards against the zero address are intentional because some listed networks are not deployed yet.
- The app does not use an indexer. Live views rely on wagmi reads plus polling (`refetchInterval` with `staleTime: 0`) and multicall patterns.
- `frontend/src/lib/balanceRefresh.ts` is the shared event bus for instant balance refresh after balance-changing actions.
- `frontend/src/lib/duelSearch.ts` builds search text from visible UI concepts for dashboard and landing-page duel search.
- The common write flow is: switch to the correct chain -> check allowance -> approve USDT if needed -> execute the contract action. For invite-only duels, the frontend generates a high-entropy secret, stores only its hash on-chain, and shares the secret in the URL fragment.
- After a successful write, refresh the affected read hook(s) and call `reset()` from `useDuelActions` so later transactions are not polluted by old wagmi state.
- Do not fall back to sharing plain `/duel/{id}` URLs for newly created duels. The full invite link with the URL fragment is required for the recipient to join or decline.
- Use `useTranslation()` for user-facing strings and add both `en` and `ru` keys in `translations.ts` when copy changes.
- Use the `@/*` import alias for frontend code (`frontend/tsconfig.json` maps it to `frontend/src/*`).
- For compact wallet display, reuse `truncateAddress()` from `frontend/src/lib/utils.ts`. Important address surfaces in the existing UI pair truncation with copy-to-clipboard access.
- Reputation labels intentionally special-case players with zero abandoned duels so they are not marked `unreliable` purely because the Wilson score is conservative on small sample sizes.
- When adding a runtime env var or secret, update `.github/workflows/ci.yml`, the matching `ops/docker-compose.*.yml`, and `CLAUDE.md`. GitHub secrets are the source of truth for deployed values.
