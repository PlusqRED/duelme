# DuelMe

P2P gaming duel platform — players wager USDT in 1v1 duels via smart contracts on Ethereum L2s. Zero fees, honor-based result reporting with on-chain reputation.

## Monorepo Structure

```
contracts/   — Solidity smart contracts (Foundry)
frontend/    — Next.js web app (App Router)
```

## Commands

### Frontend (`frontend/`)
```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type-check (no emit)
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
| `frontend/src/hooks/useRecentDuels.ts` | Landing-page duel feed with newest-first ordering |
| `frontend/src/hooks/useReputation.ts` | Wilson Score reputation calculation |
| `frontend/src/lib/invite.ts` | Secure invite-secret generation/storage helpers |
| `frontend/src/lib/duelMessage.ts` | Frontend Unicode duel-message validation |
| `frontend/src/lib/duelSearch.ts` | Shared visible-field search indexing for dashboard/recent duels |
| `frontend/src/lib/balanceRefresh.ts` | Shared client-side balance refresh event bus |
| `frontend/src/i18n/translations.ts` | EN/RU translations |
| `scripts/sync_readme_contract_addresses.py` | Sync README contract block from `run-latest.json` |

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

## Environment

- `NEXT_PUBLIC_PRIVY_APP_ID` — Privy app ID (required)
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
- Source of truth for current deploys: `contracts/broadcast/Deploy.s.sol/421614/run-latest.json`, mirrored into `README.md` and `frontend/src/lib/constants.ts`
