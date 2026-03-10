<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind" />
</p>

# DuelMe — Frontend

Next.js web app for the DuelMe P2P gaming duel platform.

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
| `/` | Landing page — hero, how it works, trust, reputation, recent duels, CTA |
| `/dashboard` | User dashboard — active duels overview |
| `/duel/create` | Create a new duel — amount input, presets, chain selector, pot preview |
| `/duel/[id]` | Duel detail — status, actions (join/claim/confirm/refund/cancel), share link |

## Project structure

```
src/
├── app/                    # Next.js app router
│   ├── layout.tsx          # Root layout — providers, header, footer
│   ├── page.tsx            # Landing page
│   ├── dashboard/          # Dashboard page
│   └── duel/
│       ├── create/         # Create duel page
│       └── [id]/           # Duel detail page
│
├── components/
│   ├── duel/               # Duel-specific components
│   │   ├── CreateDuelForm  # Wager input, presets, approve→create flow
│   │   ├── DuelCard        # Duel list card
│   │   ├── DuelStatus      # State badge + info display
│   │   ├── ClaimButtons    # claimVictory / admitDefeat actions
│   │   ├── ConfirmResult   # confirmResult + refund (after timeout)
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
│   ├── useDuel.ts          # Read single duel from contract
│   ├── useDuelActions.ts   # Write actions (create, join, claim, confirm, refund, cancel)
│   ├── useReputation.ts    # Read PlayerStats from contract
│   └── useRecentDuels.ts   # Fetch recent duel list
│
├── lib/
│   ├── contracts.ts        # ABI definitions + contract config
│   ├── constants.ts        # Chain addresses, MIN_WAGER, timeouts
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

## Configuration

### Contract addresses

After deploying smart contracts, update the addresses in `src/lib/constants.ts`:

```typescript
export const DUELME_ADDRESSES: Record<number, `0x${string}`> = {
  42161: '0x...', // Arbitrum
  137: '0x...',   // Polygon
};
```

### Environment variables

Privy and other service keys are configured through environment variables. Check `.env.example` if available, or refer to the Privy docs for required keys.

## Key patterns

### Approve → Create flow

The `CreateDuelForm` handles the two-step ERC20 flow:

1. Check existing allowance via `useReadContract`
2. If allowance sufficient — call `createDuel` directly
3. If not — call `approve`, then auto-trigger `createDuel` on success via `useEffect`

### Contract interaction hooks

All blockchain interactions go through dedicated hooks in `src/hooks/`:

- **`useDuel(id)`** — reads duel struct via `getDuel()`
- **`useDuelActions()`** — exposes `createDuel`, `joinDuel`, `claimVictory`, `admitDefeat`, `confirmResult`, `refund`, `cancelDuel`
- **`useReputation(address)`** — reads `getPlayerStats()` → `{ honored, abandoned }`

### Internationalization

EN and RU supported. The `useTranslation()` hook returns `t(key)` function that resolves strings from `src/i18n/translations.ts`.
