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
| `/duel/create` | Create a new duel — amount input, presets, chain selector, secure invite generation, optional Unicode message |
| `/duel/[id]` | Duel detail — spectator-safe timeline plus participant actions (join/decline/claim/confirm/dispute/refund/cancel/mutual-cancel/claim payout) |
| `/profile` | My Profile — inline field editing, games, reputation badge |
| `/profile/[address]` | Public profile — read-only view, "no profile" graceful state |

## Project structure

```
src/
├── app/                    # Next.js app router
│   ├── layout.tsx          # Root layout — providers, header, footer
│   ├── page.tsx            # Landing page
│   ├── dashboard/          # Dashboard page
│   ├── duel/
│   │   ├── create/         # Create duel page
│   │   └── [id]/           # Duel detail page
│   └── profile/
│       ├── page.tsx         # My Profile (auth-gated, inline editing)
│       └── [walletAddress]/ # Public profile (read-only)
│
├── components/
│   ├── duel/               # Duel-specific components
│   │   ├── CreateDuelForm  # Wager input, presets, approve→create flow
│   │   ├── DuelCard        # Duel list card
│   │   ├── DuelStatus      # State badge + info display
│   │   ├── ClaimButtons    # claimVictory / admitDefeat actions
│   │   ├── ConfirmResult   # confirmResult + refund (after timeout)
│   │   ├── CopyableAddress # Copyable wallet address with optional nickname + profile link
│   │   ├── ReputationBadge # Wilson score display
│   │   ├── ShareLink       # Copy-to-clipboard duel link
│   │   └── RecentDuels     # Recent duels list
│   ├── layout/             # Header, Footer
│   ├── wallet/             # WalletSection (connect/disconnect)
│   ├── providers/          # Privy + wagmi + QueryClient providers
│   ├── seo/                # JSON-LD structured data
│   └── ui/                 # Reusable UI primitives (button, card, dialog, etc.)
│
├── hooks/
│   ├── useAppToast.ts         # Localized top-center toast wrapper
│   ├── useDuel.ts             # Read single duel from contract
│   ├── useDuelActions.ts      # Write actions (create, join, decline, claim, confirm, refund, cancel, mutual-cancel)
│   ├── usePlayerDuels.ts      # Dashboard duel aggregation, stats, and claim data
│   ├── usePlatformStats.ts    # Landing-page Total Volume / Duels Played stats
│   ├── useRecentDuels.ts      # Latest duels feed data
│   ├── useMyProfile.ts        # Own profile (React Query + mutation)
│   ├── useProfile.ts          # Public profile read
│   ├── useNicknames.ts        # Batch nickname resolution for duel feeds
│   ├── useReputation.ts       # Single-address PlayerStats read
│   └── useReputationLevels.ts # Batch reputation reads for feed/search UI
│
├── lib/
│   ├── balanceRefresh.ts   # Event bus for instant header/wallet balance refresh
│   ├── contracts.ts        # ABI definitions + DuelState enum
│   ├── constants.ts        # Chain addresses, MIN_WAGER, timeouts
│   ├── duel.ts             # Duel formatting, timestamps, claim helpers
│   ├── duelMessage.ts      # Frontend Unicode message validation
│   ├── duelSearch.ts       # Search indexes based on visible duel-card/feed text
│   ├── invite.ts           # Secure invite-secret generation and local storage helpers
│   ├── profile.ts          # Profile types and validation constants
│   ├── profileApi.ts       # Backend profile API client
│   ├── reputation.ts       # Shared Wilson-score helpers
│   ├── wagmi.ts            # wagmi client config
│   └── utils.ts            # Utility functions
│
└── i18n/                   # Internationalization
    ├── translations.ts     # EN + RU string tables
    ├── useTranslation.ts   # Translation hook
    └── LanguageContext.ts   # Language state provider
```

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

There is currently no dedicated frontend test script. Validate frontend changes with:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

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

Arbitrum Sepolia is the currently active deployment target. The frontend reads deployed addresses from `src/lib/constants.ts`, which should be kept in sync with the tracked deploy artifact at `../contracts/broadcast/Deploy.s.sol/421614/run-latest.json`.

After deploying smart contracts, update the addresses in `src/lib/constants.ts`:

```typescript
export const DUELME_ADDRESSES: Record<number, `0x${string}`> = {
  421614: '0x...', // Arbitrum Sepolia
  42161: '0x...',  // Arbitrum One
  137: '0x...',    // Polygon
};
```

### Environment variables

Privy and other service keys are configured through environment variables. Check `.env.example` if available, or refer to the Privy docs for required keys.

## Key patterns

### Approve → Create flow with private invites

The `CreateDuelForm` handles the two-step ERC20 flow:

1. Check existing allowance via `useReadContract`
2. Generate a high-entropy invite secret client-side and hash it for on-chain storage
3. If allowance is sufficient — call `createDuel` directly (with optional Unicode challenge message)
4. If not — call `approve`, then auto-trigger `createDuel` on success via `useEffect`

The raw invite secret lives only in the shared URL fragment and local browser storage; the contract stores only its hash.

### Contract interaction hooks

All blockchain interactions go through dedicated hooks in `src/hooks/`:

- **`useDuel(id)`** — reads duel struct via `getDuel()`
- **`useDuelActions()`** — exposes create/join/decline/result/refund/cancel/mutual-cancel/claim actions
- **`usePlayerDuels()`** — reads and classifies dashboard duels, stats, and claimable amounts
- **`usePlatformStats()`** — reads landing-page hero metrics from chain state
- **`useReputation(address)`** — reads `getPlayerStats()` → `{ honored, abandoned }`

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
