<p align="center">
  <img src="https://img.shields.io/badge/Arbitrum-Sepolia-blue?style=flat-square&logo=ethereum" alt="Arbitrum Sepolia" />
  <img src="https://img.shields.io/badge/Solidity-0.8.34-363636?style=flat-square&logo=solidity" alt="Solidity" />
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/PlusqRED/69b27e3902f28e6b5fd2495fc2143f18/raw/duelme-coverage.json&style=flat-square" alt="Coverage" />
  <img src="https://github.com/PlusqRED/duelme/actions/workflows/test.yml/badge.svg" alt="CI" />
</p>

# DuelMe

Peer-to-peer gaming duel platform with USDT wagers and on-chain reputation.

Two players stake equal USDT amounts on a match. The winner takes the full pot. Every outcome is recorded on-chain, building a tamper-proof reputation score for each player.

## How it works

```
Creator deposits USDT + gets private invite link ──► Opponent opens full link and matches wager ──► Play the game off-chain
                                                                                                          │
                                 ┌────────────────────────────────────────────────────────────────────────┘
                                 ▼
                         Player submits result
                                 │
                   ┌─────────────┼─────────────┐
                   ▼             ▼             ▼
            Opponent confirms  Opponent disputes  No response (1h)
                   │             │             │
                   ▼             ▼             ▼
            Winner gets 2× pot  50/50 refund  50/50 refund
            Both get +honored   No rep change  Claimer +honored
                                               Ghost +abandoned
```

## Tech stack

| Layer | Stack |
|---|---|
| Smart contracts | Solidity 0.8.24, Foundry, OpenZeppelin |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Wallet | Privy (embedded + external wallets), wagmi, viem |
| Chain | Arbitrum Sepolia (testnet) |
| Token | USDT (MockUSDT on testnet with public faucet) |
| CI | GitHub Actions — forge tests on every push |

## Project structure

```
duelme/
├── contracts/              # Foundry project
│   ├── src/
│   │   ├── DuelMe.sol      # Core contract: duels, escrow, reputation
│   │   └── MockUSDT.sol    # Testnet ERC20 with faucet
│   ├── test/
│   │   └── DuelMe.t.sol    # 77 tests
│   └── script/
│       └── Deploy.s.sol    # Deploys MockUSDT + DuelMe
│
├── frontend/               # Next.js app
│   └── src/
│       ├── app/            # Pages: home, dashboard, create duel, duel detail
│       ├── components/     # UI, duel, layout, wallet components
│       ├── hooks/          # useDuel, useDuelActions, useReputation
│       ├── lib/            # contracts ABI, wagmi config, constants
│       └── i18n/           # EN/RU translations
│
└── .github/workflows/      # CI pipeline
```

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Foundry](https://book.getfoundry.sh/getting-started/installation)

```bash
curl -L https://foundry.paradigm.xyz | bash && foundryup
```

### Contracts

```bash
cd contracts
forge install
forge build
forge test -v
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Smart contract

### Duel lifecycle

| State | Transition | Who |
|---|---|---|
| **Created** | `createDuel(amount, inviteHash)` — creator deposits USDT and shares a private invite link | Anyone |
| **Funded** | `joinDuel(duelId, inviteSecret)` — invited opponent matches wager | Any other wallet with the invite secret |
| **Declined** | `declineDuel(duelId, inviteSecret)` — invited opponent declines, creator is refunded | Any other wallet with the invite secret |
| **WinnerClaimed** | `claimVictory(duelId)` or `admitDefeat(duelId)` | Either participant |
| **Resolved** | `confirmResult(duelId)` — winner receives 2x pot | The other participant |
| **Disputed** | `disputeResult(duelId)` — immediate 50/50 refund when the other participant disagrees | The other participant |
| **Refunded** | `refund(duelId)` — 50/50 split after 1h timeout | Anyone |
| **Cancelled** | `cancelDuel(duelId)` — full refund before join | Creator only |

### Reputation (PlayerStats)

Every wallet accumulates `duelsHonored` and `duelsAbandoned` counters on-chain:

- **confirmResult** — both players get `+1 honored`
- **disputeResult** — no stats change
- **refund** — claimer gets `+1 honored`, non-responder gets `+1 abandoned`
- **cancel / decline** — no stats change

The frontend calculates a **Wilson Score Lower Bound** from these counters for display.

### Security

- OpenZeppelin `ReentrancyGuard` on all token-moving functions
- `Pausable` with owner-only `pause()`/`unpause()` for emergencies
- `SafeERC20` for all token transfers
- Invite links use a high-entropy secret stored on-chain only as a hash; knowing the duel id alone is not enough to join or decline
- Minimum wager of 3 USDT to prevent dust spam
- No admin withdrawal — funds only move through duel resolution

## Deploy to testnet

```bash
cd contracts
cp .env.example .env
# Fill in PRIVATE_KEY, ARBITRUM_SEPOLIA_RPC_URL, ARBISCAN_API_KEY

source .env
forge script script/Deploy.s.sol \
  --rpc-url $ARBITRUM_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ARBISCAN_API_KEY
```

After deploy, update contract addresses in `frontend/src/lib/constants.ts`.

## License

MIT
