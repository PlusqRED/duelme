# DuelMe Copilot Instructions

**`CLAUDE.md` at the repo root is the full spec** — architecture decisions, development standards,
environment variables and the Common Pitfalls list. Read it before anything non-trivial. This file
only repeats the handful of rules a suggestion is most likely to get silently wrong, and it must
never contradict CLAUDE.md; if it does, CLAUDE.md is right and this file is the bug.

## Build, lint, and test commands

- Frontend (`frontend/`): `npm install` · `npm run dev` · `npm run build` · `npm run lint` ·
  `npx tsc --noEmit` · `npm test` (Vitest) · `npm run test:watch`
- Contracts (`contracts/`): `forge install` · `forge build` · `forge test` ·
  `forge test --match-test testCreateDuel` ·
  `forge test --match-test testCreateDuel --match-path test/DuelMe.t.sol` ·
  `forge coverage --report summary`
- Backend (`backend/`): `./gradlew build` · `./gradlew bootRun` · `./gradlew test` ·
  `./gradlew nativeCompile`
- One workflow, `.github/workflows/ci.yml`, covers everything: Forge tests + coverage, backend
  JVM tests, a GraalVM `nativeCompile` that gates the prod deploy, and the frontend
  lint/typecheck/test job. Merging to `dev` deploys `dev.duelme.pro`; merging to `main` deploys
  `duelme.pro`.

## Monorepo shape

- `contracts/` Foundry · `frontend/` Next.js App Router · `backend/` Java 25 + Spring Boot 4 ·
  `ops/` Docker Compose + Caddy · `ton/` a separate TON mini-app.
- `contracts/src/DuelMe.sol` is the escrow contract for 1v1 USDT duels: lifecycle, on-chain
  reputation counters, pull-based payouts, an owner pause, a separate duel-creation pause, and a
  timelocked emergency withdrawal. It trusts one immutable ERC-2771 forwarder, so duel actions can
  be relayed and funded with an EIP-2612 permit instead of an `approve`.
- Reads are hook-driven and there is no indexer: `useDuelReads.ts` pages the contract's batch
  readers (`getDuels` / `getDuelsByIds`), and every listing hook — `usePlayerDuels`,
  `useRecentDuels`, `usePublicDuels`, `usePlatformStats`, `useGameDuels` — builds on it rather
  than reading duel by duel. `useDuel` is the single-duel `getDuel` read. Live data comes from
  `refetchInterval` polling.
- Writes go through `useDuelActions` on top of `useWriteWithGas`, which chooses between the
  relayed path (`/api/relay`) and the self-paid path.
- Localization is custom, not a library: `frontend/src/i18n/LanguageContext.tsx` plus the section
  files under `frontend/src/i18n/translations/`, merged by `translations.ts`.

## Key conventions

- Import `createConfig` from `@privy-io/wagmi`, not `wagmi`. Keep `setActiveWalletForWagmi` on
  `WagmiProvider`; do not replace it with a later `useEffect`-based wallet selection.
- Use wagmi's `useSwitchChain` for network switching, not Privy's chain-switch helper.
- Never call `writeContract` directly from an action function. Privy embedded wallets sign with
  all-zero gas and nonce when the SDK auto-populates them; `useWriteWithGas` is where the explicit
  `gas` / `maxFeePerGas` / `maxPriorityFeePerGas` / `nonce` come from.
- **Never inline a contract address or a chain id.** `contracts/broadcast/*/run-latest.json` is
  what is deployed, `frontend/src/lib/constants.ts` mirrors it by hand, and everything else reads
  `constants.ts`. Two Vitest suites fail the build when a copy drifts.
- Reuse the shared exports rather than redefining them: `ZERO_ADDRESS`, `CHAIN_NAMES`,
  `SUPPORTED_CHAINS`, `DUELME_ADDRESSES` from `constants.ts`; `ACTIVE_STATES`, `DuelState`,
  `balanceOfAbi`, `transferAbi`, `getUsdtAddress` from `contracts.ts`; `truncateAddress()` and
  `cn()` from `lib/utils.ts`.
- `duelMeAbi` and `DuelState` in `frontend/src/lib/contracts.ts` are hand-made mirrors of
  `contracts/out/DuelMe.sol/DuelMe.json`. Change `DuelMe.sol` and you must update them entry for
  entry, constructor included — `contractMirrors.test.ts` compares the whole array.
- All wagers are USDT with 6 decimals: `parseUnits(amount, USDT_DECIMALS)`. The live minimum comes
  from the contract via `useContractConfig`; `MIN_WAGER` in `constants.ts` is only the pre-fetch
  fallback and must equal the deploy-time default.
- Use `useTranslation()` for every visible string, and add both `en` and `ru` keys in the matching
  `frontend/src/i18n/translations/<section>.ts`. Interpolation is `{token}` placeholders — there
  is no ICU and no plural support.
- Use the `@/*` import alias for frontend code (`frontend/tsconfig.json` maps it to
  `frontend/src/*`).
- After a successful write, `refetch()` the affected read hooks and call `reset()` so later
  transactions are not polluted by old wagmi state.
- Invite-only duels need the full link with the URL fragment. Never fall back to a plain
  `/duel/{id}` URL — the recipient cannot join or decline without the secret.
- Gate Join/Decline on `invitedOpponent`, not on `inviteHash` alone: a duel can be addressed to
  one address and carry no secret.
- Reputation labels intentionally special-case players with zero abandoned duels, so the Wilson
  score's conservatism on small samples does not mark a newcomer `unreliable`.
- When adding a runtime env var or secret, update `.github/workflows/ci.yml`, the matching
  `ops/docker-compose.*.yml`, and `CLAUDE.md`. GitHub secrets are the source of truth for deployed
  values; never commit them.
