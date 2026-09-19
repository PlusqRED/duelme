<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind" />
</p>

# DuelMe — Frontend

Next.js web app for the DuelMe P2P gaming duel platform. The frontend handles secure private invites, participant-only duel controls, spectator-safe public duel pages, claim-based payout UX, player profiles with nicknames, localized toasts, and live on-chain landing metrics.

## Tech stack

| Tool | Purpose |
|---|---|
| Next.js 16 | App router, SSR, file-based routing |
| React 19 | UI components |
| TypeScript 5 | Type safety |
| Tailwind CSS 4 | Styling |
| Privy | Wallet auth (embedded + external wallets) |
| wagmi + viem | Contract reads/writes, chain interactions |
| TanStack Query | Async state management |
| Lucide React | Icons |
| next-themes | Dark/light mode |
| Sonner | Toast notifications |

## Pages

| Route | Description |
|---|---|
| `/` | Landing page — live hero stats, how it works, trust, reputation, searchable latest duels, CTA |
| `/dashboard` | User dashboard — active/history tabs, full-text duel search, claim-all, pagination, outcome badges |
| `/duels/public` | Open lobby — duels anyone may join, with filters |
| `/duels/recent` | Latest duels across the platform, filterable by state |
| `/games` | Game catalog |
| `/games/[slug]` | One game — its duels, volume and activity |
| `/duel/create` | Create a new duel — amount input, presets, chain selector, secure invite generation, optional Unicode message |
| `/duel/[id]` | Duel detail — spectator-safe timeline plus participant actions (join/decline/claim/confirm/dispute/refund/cancel/mutual-cancel/claim payout) |
| `/profile` | My Profile — inline field editing, games, reputation badge |
| `/profile/[address]` | Public profile — read-only view, "no profile" graceful state |

## Project structure

```
src/
├── app/          # Routes (App Router). One directory per route above, plus api/relay
├── components/   # duel/ · layout/ · wallet/ · providers/ · seo/ · ui/ (shadcn primitives)
├── hooks/        # use{Feature} — one concern each; contract reads, write flows, profiles
├── lib/          # Pure logic and clients: contracts, invites, relayer, guided flows, search
└── i18n/         # EN + RU string tables and the translation hook

e2e/              # Playwright specs, beside src/
```

Individual files are not listed here — a tree that names every module goes stale the week after
it is written. The **Key Files** table in the repo's `CLAUDE.md` is the maintained map, and it is
updated in the same commit as the code it describes.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm run start
```

## Validation

```bash
npx tsc --noEmit     # types
npm run lint         # eslint
npm test             # vitest — lib/ logic, hooks, and the contract mirrors
npm run build        # production build
```

`npm test` includes the mirror checks that fail the build when the hand-written `duelMeAbi`,
`DuelState`, or the addresses in `constants.ts` drift from the contract and its deploy artifact.
The ABI check needs `forge build` to have run in `contracts/` — CI does that for you; locally it
skips if you have not.

For UI-facing changes, also verify the page in a real browser with Playwright screenshots at desktop and mobile widths. See `CLAUDE.md` for the full assistant workflow. Minimal example:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3010
npx playwright install chromium   # only if the browser runtime is missing
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010 npx playwright test e2e/public-duels.spec.ts
npx playwright screenshot --wait-for-timeout=3000 --full-page http://127.0.0.1:3010/duels/public /tmp/duels-public-desktop.png
npx playwright screenshot --viewport-size=390,844 --wait-for-timeout=3000 --full-page http://127.0.0.1:3010/duels/public /tmp/duels-public-mobile.png
```

After reviewing screenshots, remove any temporary screenshot files and stop the dev server unless it was intentionally left running.

## Configuration

### Contract addresses

Two chains: Arbitrum One (42161) in production, Arbitrum Sepolia (421614) on dev. The build picks
one with `NEXT_PUBLIC_DEFAULT_CHAIN_KEY`.

Addresses live in `SUPPORTED_CHAINS` in `src/lib/constants.ts`, and everything else in the app —
`DUELME_ADDRESSES`, `FORWARDER_ADDRESSES`, `getUsdtAddress`, `CHAIN_NAMES` — is derived from it.
Never inline an address or a chain id anywhere else.

`constants.ts` mirrors the tracked deploy artifacts by hand, so after a deploy it has to be
updated in the same commit. `src/lib/__tests__/deployedAddresses.test.ts` fails the build if it
is not, and `contractAddresses.test.ts` fails if anything in the app stops agreeing with it.

### Environment variables

Every variable the app reads, and where each one is set, is listed in the **Environment** section
of the repo's `CLAUDE.md`. The ones a local dev run needs are `NEXT_PUBLIC_PRIVY_APP_ID` and,
optionally, an authenticated RPC URL.

## Key patterns

### Funding a duel: permit or approve

Which shape the guided flow runs depends on whether the gas relayer is available
(`useRelayerStatus`), and the invite secret is generated the same way either way.

**Relayed (gasless).** The player signs an EIP-2612 permit and an EIP-712 ForwardRequest —
no transaction, no ETH. `useDuelActions` calls `createDuelWithPermit` / `joinDuelWithPermit`
through `/api/relay`, and the approve step is not shown at all. The permit domain is rebuilt
from the token's `name()` + version `"1"` and checked against its `DOMAIN_SEPARATOR()` before
anything is signed.

**Self-paid.** The classic two-step ERC20 flow: check the allowance via `useReadContract`,
`approve` if it is short, then `createDuel`. The player pays gas for both.

There is no automatic fallback between them — a relayer refusal surfaces as an error rather
than silently reverting to a transaction the player has to fund.

The raw invite secret lives only in the shared URL fragment and local browser storage; the
contract stores only its hash.

### Contract interaction hooks

All blockchain interactions go through dedicated hooks in `src/hooks/`:

- **`useDuel(id)`** — reads duel struct via `getDuel()`
- **`useDuelActions()`** — exposes create/join/decline/result/refund/cancel/mutual-cancel/claim actions
- **`usePlayerDuels()`** — reads and classifies dashboard duels, stats, and claimable amounts
- **`usePlatformStats()`** — reads landing-page hero metrics from chain state
- **`useReputation(address)`** — reads `getPlayerStats()` and derives the Wilson score from
  `duelsHonored` / `duelsAbandoned`
- **`useDuelReads`** — the paged `getDuels` / `getDuelsByIds` readers every listing screen shares

### Claim-based payouts

Terminal duel outcomes do not push funds automatically. The UI surfaces claimable balances and uses:

- `claimPayout(duelId)` for individual claim actions
- `claimPayouts(duelIds)` for dashboard claim-all UX

### Instant balance refresh

`src/lib/balanceRefresh.ts` broadcasts successful balance-changing actions so the header and wallet balances refresh immediately instead of waiting for the polling interval.

### Search semantics

Dashboard and landing-page duel search are based on the same labels and values the user sees on screen (status, outcome, message, addresses, chain, claim state), not just raw addresses.

### Internationalization

EN and RU are supported. `useTranslation()` resolves strings from `src/i18n/translations.ts`, and all user-facing copy — including toasts and duel/search UI — should stay centralized there.
