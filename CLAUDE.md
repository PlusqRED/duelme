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
All write operations follow: check chain → check allowance → approve if needed → execute. Both `createDuel` and `joinDuel` use this two-step approve+action flow.

### Data Fetching
- wagmi `useReadContract` / `useReadContracts` (multicall) for on-chain reads
- React Query with `refetchInterval: 10_000, staleTime: 0` for live data
- Always `refetch()` + `reset()` after successful write transactions

### Smart Contract
- Solidity 0.8.34, OpenZeppelin (SafeERC20, ReentrancyGuard, Pausable, Ownable)
- All state-mutating functions have `nonReentrant` + `whenNotPaused`
- USDT uses 6 decimals — `wagerAmount` is stored raw (e.g., `5_000_000` = 5 USDT)
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
| `frontend/src/hooks/useReputation.ts` | Wilson Score reputation calculation |
| `frontend/src/i18n/translations.ts` | EN/RU translations |

## Duel States

```
Created(0) → Funded(1) → WinnerClaimed(2) → Resolved(3)
                                           → Refunded(4)
Created(0) → Cancelled(5)
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
- USDT has a blocklist — push payments can permanently lock funds (contract uses push pattern currently)
- Wilson Score gives low scores for small sample sizes — players with 0 abandoned duels are never "unreliable"
